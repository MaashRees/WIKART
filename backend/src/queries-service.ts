import { Driver, int } from 'neo4j-driver';
import { neo4jDriver } from './neo4j.js';
import { env } from './env.js';

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
			QueriesMetierService.#instance = new QueriesMetierService(driver, database);
		}
		return QueriesMetierService.#instance;
	}

	private async runQuery<T>(query: string, params: Record<string, any> = {}): Promise<T[]> {
    const session = this.#driver.session(this.#database ? { database: this.#database } : undefined);
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject() as unknown as T);
    } finally {
      await session.close();
    }
  }

  async artistesCentrauxMouvement(mouvement: string, limit: number = 10) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WHERE toLower(mv.nom) = toLower($mouvement)
      OPTIONAL MATCH (a)-[r:INFLUENCE_PAR]-()
      RETURN coalesce(a.label_wikidata, a.nom) AS artiste, count(r) AS degre_influence
      ORDER BY degre_influence DESC, artiste
      LIMIT $limit
    `;
    return this.runQuery<{ artiste: string; degre_influence: number }>(query, {
      mouvement,
      limit: int(limit)
    });
  }

  async chaineInfluence(depart: string, arrivee: string) {
    // INFLUENCE_PAR est orienté de l'artiste influencé vers son influenceur
    // (Boudin -[:INFLUENCE_PAR]-> Courbet = "Boudin influencé par Courbet").
    // On matche donc en non dirigé : la question porte sur l'existence d'une
    // chaîne d'influence entre les deux artistes, pas sur le sens strict de
    // la relation.
    const query = `
      MATCH (a:Artiste)
      WHERE (a.nom IS NOT NULL OR a.label_wikidata IS NOT NULL)
        AND (
          toLower(coalesce(a.label_wikidata, a.nom)) = toLower($depart)
          OR toLower(coalesce(a.label_wikidata, a.nom)) CONTAINS toLower($depart)
        )
      WITH collect(DISTINCT a) AS departArts
      MATCH (b:Artiste)
      WHERE (b.nom IS NOT NULL OR b.label_wikidata IS NOT NULL)
        AND (
          toLower(coalesce(b.label_wikidata, b.nom)) = toLower($arrivee)
          OR toLower(coalesce(b.label_wikidata, b.nom)) CONTAINS toLower($arrivee)
        )
      WITH head(departArts) AS a, collect(DISTINCT b) AS arriveeArts
      WITH a, head(arriveeArts) AS b
      WHERE a IS NOT NULL AND b IS NOT NULL AND a <> b
      MATCH p = shortestPath((a)-[:INFLUENCE_PAR*1..6]-(b))
      RETURN [n IN nodes(p) | coalesce(n.label_wikidata, n.nom)] AS chaine, length(p) AS nb_sauts
      LIMIT 1
    `;
    return this.runQuery<{ chaine: string[]; nb_sauts: number }>(query, { depart, arrivee });
  }

  async concentrationGeoMouvement(mouvement: string) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WHERE toLower(mv.nom) = toLower($mouvement)
      MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      RETURN r.nom AS region, count(DISTINCT o) AS nb_oeuvres
      ORDER BY nb_oeuvres DESC
    `;
    return this.runQuery<{ region: string; nb_oeuvres: number }>(query, { mouvement });
  }

  async museesHubsMouvement(mouvement: string, limit: number = 10) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WHERE toLower(mv.nom) = toLower($mouvement)
      MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      RETURN m.nom AS musee, count(DISTINCT o) AS nb_oeuvres
      ORDER BY nb_oeuvres DESC
      LIMIT $limit
    `;
    return this.runQuery<{ musee: string; nb_oeuvres: number }>(query, {
      mouvement,
      limit: int(limit)
    });
  }

  async statsGlobales() {
    const [
      [nbOeuvres],
      [nbArtistes],
      [nbMusees],
      [nbMouvements],
      parMouvement,
      parArtiste,
      parMusee,
      parDecennie,
      parRegion,
      topArtistesParMouvement,
    ] = await Promise.all([
      this.runQuery<{ n: number }>('MATCH (o:Oeuvre) RETURN count(o) AS n'),
      this.runQuery<{ n: number }>('MATCH (a:Artiste) RETURN count(a) AS n'),
      this.runQuery<{ n: number }>('MATCH (m:Musee) RETURN count(m) AS n'),
      this.runQuery<{ n: number }>('MATCH (mv:MouvementArtistique) RETURN count(mv) AS n'),
      this.runQuery<{ mouvement: string; nb: number }>(`
        MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
        MATCH (a)-[:A_CREE]->(o:Oeuvre)
        RETURN mv.nom AS mouvement, count(DISTINCT o) AS nb
        ORDER BY nb DESC
        LIMIT 10
      `),
      this.runQuery<{ artiste: string; nb: number }>(`
        MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)
        RETURN a.nom AS artiste, count(o) AS nb
        ORDER BY nb DESC
        LIMIT 10
      `),
      this.runQuery<{ musee: string; nb: number }>(`
        MATCH (o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
        RETURN m.nom AS musee, count(o) AS nb
        ORDER BY nb DESC
        LIMIT 10
      `),
      this.runQuery<{ decennie: number; nb: number }>(`
        MATCH (o:Oeuvre)
        WHERE o.annee_creation IS NOT NULL
        WITH toInteger(o.annee_creation / 10) * 10 AS decennie
        RETURN decennie, count(*) AS nb
        ORDER BY decennie
      `),
      this.runQuery<{ region: string; nb: number }>(`
        MATCH (o:Oeuvre)-[:EXPOSEE_A]->(:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
        RETURN r.nom AS region, count(o) AS nb
        ORDER BY nb DESC
        LIMIT 10
      `),
      this.runQuery<{ artiste: string; mouvement: string | null; nb: number }>(`
        MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)
        OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
        WITH a, head(collect(mv.nom)) AS mouvement, count(o) AS nb
        RETURN a.nom AS artiste, mouvement, nb
        ORDER BY nb DESC
        LIMIT 10
      `),
    ]);

    return {
      nbOeuvres: nbOeuvres.n,
      nbArtistes: nbArtistes.n,
      nbMusees: nbMusees.n,
      nbMouvements: nbMouvements.n,
      parMouvement,
      parArtiste,
      parMusee,
      parDecennie,
      parRegion,
      topArtistesParMouvement,
    };
  }

  async listerMusees() {
    const query = `
      MATCH (m:Musee)
      OPTIONAL MATCH (m)<-[:EXPOSEE_A]-(:Oeuvre)<-[:A_CREE]-(a:Artiste)
        -[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      RETURN m.nom AS nom, toFloat(m.lat) AS lat, toFloat(m.lon) AS lon,
        collect(DISTINCT mv.nom) AS mouvements
      ORDER BY nom
    `;
    return this.runQuery<Musee>(query);
  }

  async repartitionOeuvresArtiste(artisteNom: string) {
    const query = `
      MATCH (a:Artiste)
      WHERE (a.nom IS NOT NULL OR a.label_wikidata IS NOT NULL)
        AND (
          toLower(coalesce(a.label_wikidata, a.nom)) = toLower($artisteNom)
          OR toLower(coalesce(a.label_wikidata, a.nom)) CONTAINS toLower($artisteNom)
        )
      MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (m)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      RETURN m.nom AS musee, coalesce(r.nom, 'Inconnue') AS region, count(DISTINCT o) AS nb_oeuvres
      ORDER BY nb_oeuvres DESC
    `;
    return this.runQuery<{ musee: string; region: string; nb_oeuvres: number }>(query, { artisteNom });
  }

  // Certaines notices Joconde sont créditées à plusieurs Artiste distincts
  // (ex. "d'après" : copie/école, plusieurs graphies pour un même contributeur)
  // — sans regroupement, MATCH (a)-[:A_CREE]->(o) renvoie une ligne par artiste
  // pour la même Oeuvre, ce qui duplique o.reference (viole la contrainte
  // d'unicité au niveau applicatif) et casse les clés React côté frontend.
  // On regroupe donc par (o, m) et on joint les artistes distincts.
  static readonly #listeArtistesJointsFragment = `
    reduce(s = '', nom IN artistes | CASE WHEN s = '' THEN nom ELSE s + '; ' + nom END) AS artiste
  `;

  async listerOeuvres(page: number = 1, limit: number = 20) {
    const query = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WITH o, m, collect(DISTINCT a.nom) AS artistes, collect(DISTINCT mv.nom) AS mouvements
      RETURN o.reference AS reference, o.titre AS titre,
        ${QueriesMetierService.#listeArtistesJointsFragment},
        head(mouvements) AS mouvement, toFloat(o.annee_creation) AS annee, m.nom AS musee
      ORDER BY o.titre
      SKIP $skip LIMIT $limit
    `;
    return this.runQuery<Oeuvre>(query, {
      skip: int((page - 1) * limit),
      limit: int(limit),
    });
  }

  async trouverOeuvre(reference: string) {
    const query = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre {reference: $reference})-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WITH o, m, collect(DISTINCT a.nom) AS artistes, collect(DISTINCT mv.nom) AS mouvements
      RETURN o.reference AS reference, o.titre AS titre,
        ${QueriesMetierService.#listeArtistesJointsFragment},
        head(mouvements) AS mouvement, toFloat(o.annee_creation) AS annee, m.nom AS musee
    `;
    const [oeuvre] = await this.runQuery<Oeuvre>(query, { reference });
    return oeuvre;
  }

  // Résout artiste/mouvement/musée en les créant s'ils n'existent pas encore
  // (MERGE), plutôt que d'exiger qu'ils préexistent (MATCH strict) : le
  // formulaire CRUD a des champs texte libres, il doit pouvoir enregistrer un
  // artiste, un musée ou un mouvement inédits. Le mouvement est recherché de
  // façon insensible à la casse pour éviter de dupliquer "impressionnisme" en
  // "Impressionnisme" ; l'artiste et le musée suivent la casse exacte saisie,
  // cohérent avec le reste de l'appli (pas de dédoublonnage fuzzy, cf.
  // constraints.cypher).
  static readonly #resoudreEntitesFragment = `
    MERGE (a:Artiste {nom: $artiste})
    WITH a
    CALL {
      WITH $mouvement AS mouvementNom
      OPTIONAL MATCH (existant:MouvementArtistique) WHERE toLower(existant.nom) = toLower(mouvementNom)
      FOREACH (_ IN CASE WHEN existant IS NULL THEN [1] ELSE [] END |
        CREATE (:MouvementArtistique {nom: mouvementNom})
      )
      WITH mouvementNom
      MATCH (mv:MouvementArtistique) WHERE toLower(mv.nom) = toLower(mouvementNom)
      RETURN mv LIMIT 1
    }
    MERGE (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
    MERGE (m:Musee {nom: $musee})
  `;

  async creerOeuvre(oeuvre: OeuvreInput) {
    const query = `
      ${QueriesMetierService.#resoudreEntitesFragment}
      CREATE (o:Oeuvre {reference: $reference, titre: $titre, annee_creation: $annee})
      CREATE (a)-[:A_CREE]->(o)
      CREATE (o)-[:EXPOSEE_A]->(m)
      RETURN o.reference AS reference, o.titre AS titre, a.nom AS artiste, mv.nom AS mouvement,
        toFloat(o.annee_creation) AS annee, m.nom AS musee
    `;
    const [created] = await this.runQuery<Oeuvre>(query, oeuvre);
    return created;
  }

  async modifierOeuvre(reference: string, oeuvre: Omit<OeuvreInput, 'titre' | 'reference'>) {
    const query = `
      MATCH (o:Oeuvre {reference: $reference})
      ${QueriesMetierService.#resoudreEntitesFragment}
      OPTIONAL MATCH ()-[ancienneCreation:A_CREE]->(o)
      WITH o, a, mv, m, collect(ancienneCreation) AS anciennesCreations
      FOREACH (relation IN anciennesCreations | DELETE relation)
      OPTIONAL MATCH (o)-[ancienneExposition:EXPOSEE_A]->()
      WITH o, a, mv, m, collect(ancienneExposition) AS anciennesExpositions
      FOREACH (relation IN anciennesExpositions | DELETE relation)
      SET o.annee_creation = $annee
      CREATE (a)-[:A_CREE]->(o)
      CREATE (o)-[:EXPOSEE_A]->(m)
      RETURN o.reference AS reference, o.titre AS titre, a.nom AS artiste, mv.nom AS mouvement,
        toFloat(o.annee_creation) AS annee, m.nom AS musee
    `;
    const [updated] = await this.runQuery<Oeuvre>(query, { reference, ...oeuvre });
    return updated;
  }

  async supprimerOeuvre(reference: string) {
    const query = `
      MATCH (o:Oeuvre {reference: $reference})
      WITH o, o.titre AS titre
      DETACH DELETE o
      RETURN $reference AS reference, titre
    `;
    const [deleted] = await this.runQuery<{ reference: string; titre: string }>(query, { reference });
    return deleted;
  }
}

export type Musee = {
  nom: string;
  lat: number | null;
  lon: number | null;
  mouvements: string[];
};

export type Oeuvre = {
  reference: string;
  titre: string;
  artiste: string;
  mouvement: string | null;
  annee: number | null;
  musee: string;
};

export type OeuvreInput = Omit<Oeuvre, 'mouvement' | 'reference'> & {
  mouvement: string;
  reference: string;
};

export const queriesMetierService = QueriesMetierService.create(neo4jDriver, env.NEO4J_DATABASE);
