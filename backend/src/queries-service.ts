import { Driver, int, isInt } from "neo4j-driver";
import { env } from "./env.js";
import { neo4jDriver } from "./neo4j.js";

function formatNeo4jResult<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (isInt(obj)) return obj.toNumber() as unknown as T;
  if (Array.isArray(obj)) return obj.map(formatNeo4jResult) as unknown as T;
  if (typeof obj === "object") {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = formatNeo4jResult(obj[key]);
    }
    return res as T;
  }
  return obj as T;
}

export class QueriesMetierService {
  readonly #driver: Driver;
  readonly #database: string;
  static #instance: QueriesMetierService;

  private constructor(driver: Driver, database: string) {
    this.#driver = driver;
    this.#database = database;
  }

  static create(driver: Driver, database: string) {
    if (!QueriesMetierService.#instance) {
      QueriesMetierService.#instance = new QueriesMetierService(
        driver,
        database,
      );
    }
    return QueriesMetierService.#instance;
  }

  private async runQuery<T>(
    query: string,
    params: Record<string, any> = {},
  ): Promise<T[]> {
    const session = this.#driver.session(
      this.#database ? { database: this.#database } : undefined,
    );
    try {
      const result = await session.run(query, params);
      return result.records.map((record) =>
        formatNeo4jResult<T>(record.toObject()),
      );
    } finally {
      await session.close();
    }
  }

  async getDashboardStats() {
    const queryCounts = `
      MATCH (o:Oeuvre) WITH count(o) AS nbOeuvres
      MATCH (a:Artiste) WITH nbOeuvres, count(a) AS nbArtistes
      MATCH (m:Musee) WITH nbOeuvres, nbArtistes, count(m) AS nbMusees
      MATCH (mv:MouvementArtistique) WITH nbOeuvres, nbArtistes, nbMusees, count(mv) AS nbMouvements
      RETURN nbOeuvres, nbArtistes, nbMusees, nbMouvements
    `;
    const queryVolume = `
      MATCH (mv:MouvementArtistique)
      WHERE mv.nom IS NOT NULL AND trim(mv.nom) <> ''
      OPTIONAL MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
      OPTIONAL MATCH (a)-[:A_CREE]->(o:Oeuvre)
      WITH mv, count(DISTINCT o) AS nb
      WHERE nb > 0
      RETURN mv.nom AS mouvement, nb
      ORDER BY nb DESC
      LIMIT 10
    `;
    const queryArtistes = `
      MATCH (a:Artiste)
      OPTIONAL MATCH (a)-[:A_CREE]->(o:Oeuvre)
      WITH coalesce(toString(a.label_wikidata), toString(a.nom), '') AS artiste, count(DISTINCT o) AS nb
      WHERE trim(artiste) <> '' AND nb > 0
      RETURN artiste, nb
      ORDER BY nb DESC
      LIMIT 10
    `;
    const queryMusees = `
      MATCH (m:Musee)
      OPTIONAL MATCH (o:Oeuvre)-[:EXPOSEE_A]->(m)
      WITH coalesce(toString(m.nom), '') AS musee, count(DISTINCT o) AS nb
      WHERE trim(musee) <> '' AND nb > 0
      RETURN musee, nb
      ORDER BY nb DESC
      LIMIT 10
    `;
    const queryDecennies = `
      MATCH (o:Oeuvre)
      WHERE o.annee_creation IS NOT NULL
      WITH toInteger(floor(toFloat(o.annee_creation) / 10) * 10) AS decennie, count(DISTINCT o) AS nb
      WHERE decennie IS NOT NULL
      RETURN decennie, nb
      ORDER BY decennie ASC
    `;
    const queryRegions = `
      MATCH (o:Oeuvre)-[:EXPOSEE_A]->(:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      WITH coalesce(toString(r.nom), 'Inconnue') AS region, count(DISTINCT o) AS nb
      WHERE trim(region) <> '' AND nb > 0
      RETURN region, nb
      ORDER BY nb DESC
      LIMIT 10
    `;
    const queryTopArtistesParMouvement = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WITH coalesce(toString(a.label_wikidata), toString(a.nom), '') AS artiste,
           head([x IN collect(DISTINCT mv.nom) WHERE x IS NOT NULL AND trim(x) <> '']) AS mouvement,
           count(DISTINCT o) AS nb
      WHERE trim(artiste) <> '' AND nb > 0
      RETURN artiste, coalesce(mouvement, 'Non renseigné') AS mouvement, nb
      ORDER BY nb DESC, artiste ASC
      LIMIT 10
    `;
    const [counts] = await this.runQuery<{
      nbOeuvres: number;
      nbArtistes: number;
      nbMusees: number;
      nbMouvements: number;
    }>(queryCounts);
    const parMouvement = await this.runQuery<{ mouvement: string; nb: number }>(
      queryVolume,
    );
    const parArtiste = await this.runQuery<{ artiste: string; nb: number }>(
      queryArtistes,
    );
    const parMusee = await this.runQuery<{ musee: string; nb: number }>(
      queryMusees,
    );
    const parDecennie = await this.runQuery<{ decennie: number; nb: number }>(
      queryDecennies,
    );
    const parRegion = await this.runQuery<{ region: string; nb: number }>(
      queryRegions,
    );
    const topArtistesParMouvement = await this.runQuery<{
      artiste: string;
      mouvement: string;
      nb: number;
    }>(queryTopArtistesParMouvement);

    return {
      ...(counts || {
        nbOeuvres: 0,
        nbArtistes: 0,
        nbMusees: 0,
        nbMouvements: 0,
      }),
      parMouvement,
      parArtiste,
      parMusee,
      parDecennie,
      parRegion,
      topArtistesParMouvement,
    };
  }

  async artistesCentrauxMouvement(mouvement: string, limit: number = 10) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower($mouvement)
      OPTIONAL MATCH (a)-[r:INFLUENCE_PAR]-()
      RETURN coalesce(toString(a.label_wikidata), toString(a.nom)) AS artiste, count(r) AS degre_influence
      ORDER BY degre_influence DESC, artiste
      LIMIT $limit
    `;
    return this.runQuery<{ artiste: string; degre_influence: number }>(query, {
      mouvement,
      limit: int(limit),
    });
  }

  async chaineInfluence(depart: string, arrivee: string) {
    const query = `
      MATCH (a:Artiste)
      WHERE (a.nom IS NOT NULL OR a.label_wikidata IS NOT NULL)
        AND (
          toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) = toLower($depart)
          OR toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) CONTAINS toLower($depart)
        )
      WITH collect(DISTINCT a) AS departArts
      MATCH (b:Artiste)
      WHERE (b.nom IS NOT NULL OR b.label_wikidata IS NOT NULL)
        AND (
          toLower(coalesce(toString(b.label_wikidata), toString(b.nom), '')) = toLower($arrivee)
          OR toLower(coalesce(toString(b.label_wikidata), toString(b.nom), '')) CONTAINS toLower($arrivee)
        )
      WITH head(departArts) AS a, collect(DISTINCT b) AS arriveeArts
      WITH a, head(arriveeArts) AS b
      WHERE a IS NOT NULL AND b IS NOT NULL AND a <> b
      MATCH p = shortestPath((a)-[:INFLUENCE_PAR*1..6]-(b))
      RETURN [n IN nodes(p) | coalesce(n.label_wikidata, n.nom)] AS chaine, length(p) AS nb_sauts
      LIMIT 1
    `;
    return this.runQuery<{ chaine: string[]; nb_sauts: number }>(query, {
      depart,
      arrivee,
    });
  }

  async concentrationGeoMouvement(mouvement: string) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower($mouvement)
      MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      RETURN r.nom AS region, count(DISTINCT o) AS nb, count(DISTINCT o) AS nb_oeuvres
      ORDER BY nb DESC
    `;
    return this.runQuery<{ region: string; nb: number; nb_oeuvres: number }>(
      query,
      { mouvement },
    );
  }

  async museesHubsMouvement(mouvement: string, limit: number = 10) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower($mouvement)
      MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      RETURN m.nom AS musee, count(DISTINCT o) AS nb, count(DISTINCT o) AS nb_oeuvres
      ORDER BY nb DESC
      LIMIT $limit
    `;
    return this.runQuery<{ musee: string; nb: number; nb_oeuvres: number }>(
      query,
      {
        mouvement,
        limit: int(limit),
      },
    );
  }

  async listerMusees() {
    const query = `
      MATCH (m:Musee)
      WHERE m.lat IS NOT NULL AND m.lon IS NOT NULL
      OPTIONAL MATCH (m)<-[:EXPOSEE_A]-(o:Oeuvre)<-[:A_CREE]-(a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      RETURN m.nom AS nom, toFloat(m.lat) AS lat, toFloat(m.lon) AS lon,
             [x IN collect(DISTINCT mv.nom) WHERE x IS NOT NULL AND trim(x) <> ''] AS mouvements
      ORDER BY nom
    `;
    return this.runQuery<Musee>(query);
  }

  async repartitionOeuvresArtiste(artisteNom: string) {
    const query = `
      MATCH (a:Artiste)
      WHERE (a.nom IS NOT NULL OR a.label_wikidata IS NOT NULL)
        AND (
          toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) = toLower($artisteNom)
          OR toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) CONTAINS toLower($artisteNom)
        )
      MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (m)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      RETURN m.nom AS musee, coalesce(r.nom, 'Inconnue') AS region, count(DISTINCT o) AS nb, count(DISTINCT o) AS nb_oeuvres
      ORDER BY nb DESC
    `;
    return this.runQuery<{
      musee: string;
      region: string;
      nb: number;
      nb_oeuvres: number;
    }>(query, { artisteNom });
  }

  async listerOeuvres(limit: number = 50, search: string = "") {
    const query = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      WHERE $search = '' OR $search IS NULL
         OR toLower(o.titre) CONTAINS toLower($search)
        OR toLower(coalesce(toString(a.nom), toString(a.label_wikidata), '')) CONTAINS toLower($search)
        OR toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) CONTAINS toLower($search)
        OR toLower(coalesce(toString(m.nom), '')) CONTAINS toLower($search)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      RETURN o.titre AS titre, coalesce(toString(a.label_wikidata), toString(a.nom)) AS artiste,
             head([x IN collect(mv.nom) WHERE x IS NOT NULL]) AS mouvement,
             toFloat(o.annee_creation) AS annee, m.nom AS musee
      ORDER BY o.titre
      LIMIT $limit
    `;
    return this.runQuery<Oeuvre>(query, { limit: int(limit), search });
  }

  async trouverOeuvre(titre: string) {
    const query = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre {titre: $titre})-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      RETURN o.titre AS titre, coalesce(toString(a.label_wikidata), toString(a.nom)) AS artiste,
             head([x IN collect(mv.nom) WHERE x IS NOT NULL]) AS mouvement,
             toFloat(o.annee_creation) AS annee, m.nom AS musee
    `;
    const [oeuvre] = await this.runQuery<Oeuvre>(query, { titre });
    return oeuvre;
  }

  async oeuvreExiste(titre: string) {
    const query = `
      MATCH (o:Oeuvre {titre: $titre})
      RETURN o.titre AS titre
    `;
    const result = await this.runQuery<{ titre: string }>(query, { titre });
    return result.length > 0;
  }

  async peutRelierOeuvre(artiste: string, mouvement: string, musee: string) {
    const query = `
      MATCH (a:Artiste)
      WHERE toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) = toLower($artiste)
         OR toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) CONTAINS toLower($artiste)
      MATCH (mv:MouvementArtistique)
      WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower($mouvement)
      MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
      MATCH (m:Musee)
      WHERE toLower(coalesce(toString(m.nom), '')) = toLower($musee)
         OR toLower(coalesce(toString(m.nom), '')) CONTAINS toLower($musee)
      RETURN a.nom AS artiste
    `;
    const result = await this.runQuery<{ artiste: string }>(query, {
      artiste,
      mouvement,
      musee,
    });
    return result.length > 0;
  }

  async creerOeuvre(oeuvre: OeuvreInput) {
    const query = `
      MATCH (a:Artiste)
      WHERE toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) = toLower($artiste)
         OR toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) CONTAINS toLower($artiste)
      MATCH (mv:MouvementArtistique)
      WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower($mouvement)
      MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
      MATCH (m:Musee)
      WHERE toLower(coalesce(toString(m.nom), '')) = toLower($musee)
         OR toLower(coalesce(toString(m.nom), '')) CONTAINS toLower($musee)
        WITH head(collect(a)) AS a, head(collect(m)) AS m
      MERGE (o:Oeuvre {reference: $reference})
      SET o.titre = $titre,
          o.annee_creation = $annee
      CREATE (a)-[:A_CREE]->(o)
      CREATE (o)-[:EXPOSEE_A]->(m)
        RETURN o.titre AS titre, coalesce(toString(a.label_wikidata), toString(a.nom)) AS artiste, $mouvement AS mouvement,
        toFloat(o.annee_creation) AS annee, m.nom AS musee
    `;
    const [created] = await this.runQuery<Oeuvre>(query, {
      ...oeuvre,
      reference: oeuvre.titre,
    });
    return created;
  }

  async modifierOeuvre(titre: string, oeuvre: Omit<OeuvreInput, "titre">) {
    const query = `
      MATCH (o:Oeuvre)
      WHERE o.titre = $titre OR o.reference = $titre
      MATCH (a:Artiste)
      WHERE toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) = toLower($artiste)
        OR toLower(coalesce(toString(a.label_wikidata), toString(a.nom), '')) CONTAINS toLower($artiste)
      MATCH (mv:MouvementArtistique)
      WHERE mv.nom IS NOT NULL AND toLower(mv.nom) = toLower($mouvement)
      MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
      MATCH (m:Musee)
      WHERE toLower(coalesce(toString(m.nom), '')) = toLower($musee)
        OR toLower(coalesce(toString(m.nom), '')) CONTAINS toLower($musee)
      WITH o, head(collect(a)) AS a, head(collect(m)) AS m
      OPTIONAL MATCH ()-[ancienneCreation:A_CREE]->(o)
      WITH o, a, m, collect(ancienneCreation) AS anciennesCreations
      FOREACH (relation IN anciennesCreations | DELETE relation)
      OPTIONAL MATCH (o)-[ancienneExposition:EXPOSEE_A]->()
      WITH o, a, m, collect(ancienneExposition) AS anciennesExpositions
      FOREACH (relation IN anciennesExpositions | DELETE relation)
      SET o.annee_creation = $annee
      CREATE (a)-[:A_CREE]->(o)
      CREATE (o)-[:EXPOSEE_A]->(m)
      RETURN o.titre AS titre, coalesce(toString(a.label_wikidata), toString(a.nom)) AS artiste, $mouvement AS mouvement,
        toFloat(o.annee_creation) AS annee, m.nom AS musee
    `;
    const [updated] = await this.runQuery<Oeuvre>(query, { titre, ...oeuvre });
    return updated;
  }

  async supprimerOeuvre(titre: string) {
    const query = `
      MATCH (o:Oeuvre {titre: $titre})
      DETACH DELETE o
      RETURN $titre AS titre
    `;
    const [deleted] = await this.runQuery<{ titre: string }>(query, { titre });
    return deleted;
  }
}

export type Oeuvre = {
  titre: string;
  artiste: string;
  mouvement: string | null;
  annee: number | null;
  musee: string;
};

export type Musee = {
  nom: string;
  lat: number;
  lon: number;
  mouvements: string[];
};

export type OeuvreInput = Omit<Oeuvre, "mouvement"> & {
  mouvement: string;
};

export const queriesMetierService = QueriesMetierService.create(
  neo4jDriver,
  env.NEO4J_DATABASE,
);
