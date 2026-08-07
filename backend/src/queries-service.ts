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
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
      OPTIONAL MATCH (a)-[r:INFLUENCE_PAR]-()
      RETURN a.label_wikidata AS artiste, count(r) AS degre_influence
      ORDER BY degre_influence DESC, artiste
      LIMIT $limit
    `;
    return this.runQuery<{ artiste: string; degre_influence: number }>(query, {
      mouvement,
      limit: int(limit)
    });
  }

  async chaineInfluence(depart: string, arrivee: string) {
    const query = `
      MATCH p = shortestPath(
          (a:Artiste {label_wikidata: $depart})-[:INFLUENCE_PAR*1..6]->(b:Artiste {label_wikidata: $arrivee})
      )
      RETURN [n IN nodes(p) | coalesce(n.label_wikidata, n.nom)] AS chaine, length(p) AS nb_sauts
    `;
    return this.runQuery<{ chaine: string[]; nb_sauts: number }>(query, { depart, arrivee });
  }

  async concentrationGeoMouvement(mouvement: string) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
      MATCH (a)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      RETURN r.nom AS region, count(DISTINCT o) AS nb_oeuvres
      ORDER BY nb_oeuvres DESC
    `;
    return this.runQuery<{ region: string; nb_oeuvres: number }>(query, { mouvement });
  }

  async museesHubsMouvement(mouvement: string, limit: number = 10) {
    const query = `
      MATCH (a:Artiste)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
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
      MATCH (a:Artiste {nom: $artisteNom})-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
          -[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      RETURN m.nom AS musee, r.nom AS region, count(o) AS nb_oeuvres
      ORDER BY nb_oeuvres DESC
    `;
    return this.runQuery<{ musee: string; region: string; nb_oeuvres: number }>(query, { artisteNom });
  }

  async listerOeuvres() {
    const query = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      RETURN o.titre AS titre, a.nom AS artiste, head(collect(mv.nom)) AS mouvement,
        toFloat(o.annee_creation) AS annee, m.nom AS musee
      ORDER BY o.titre
    `;
    return this.runQuery<Oeuvre>(query);
  }

  async trouverOeuvre(titre: string) {
    const query = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre {titre: $titre})-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      RETURN o.titre AS titre, a.nom AS artiste, head(collect(mv.nom)) AS mouvement,
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
      MATCH (a:Artiste {nom: $artiste})-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
      MATCH (m:Musee {nom: $musee})
      RETURN a.nom AS artiste
    `;
    const result = await this.runQuery<{ artiste: string }>(query, { artiste, mouvement, musee });
    return result.length > 0;
  }

  async creerOeuvre(oeuvre: OeuvreInput) {
    const query = `
      MATCH (a:Artiste {nom: $artiste})-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
      MATCH (m:Musee {nom: $musee})
      CREATE (o:Oeuvre {titre: $titre, annee_creation: $annee})
      CREATE (a)-[:A_CREE]->(o)
      CREATE (o)-[:EXPOSEE_A]->(m)
      RETURN o.titre AS titre, a.nom AS artiste, mv.nom AS mouvement,
        toFloat(o.annee_creation) AS annee, m.nom AS musee
    `;
    const [created] = await this.runQuery<Oeuvre>(query, oeuvre);
    return created;
  }

  async modifierOeuvre(titre: string, oeuvre: Omit<OeuvreInput, 'titre'>) {
    const query = `
      MATCH (o:Oeuvre {titre: $titre})
      MATCH (a:Artiste {nom: $artiste})-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
      MATCH (m:Musee {nom: $musee})
      OPTIONAL MATCH ()-[ancienneCreation:A_CREE]->(o)
      WITH o, a, mv, m, collect(ancienneCreation) AS anciennesCreations
      FOREACH (relation IN anciennesCreations | DELETE relation)
      OPTIONAL MATCH (o)-[ancienneExposition:EXPOSEE_A]->()
      WITH o, a, mv, m, collect(ancienneExposition) AS anciennesExpositions
      FOREACH (relation IN anciennesExpositions | DELETE relation)
      SET o.annee_creation = $annee
      CREATE (a)-[:A_CREE]->(o)
      CREATE (o)-[:EXPOSEE_A]->(m)
      RETURN o.titre AS titre, a.nom AS artiste, mv.nom AS mouvement,
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

export type OeuvreInput = Omit<Oeuvre, 'mouvement'> & {
  mouvement: string;
};

export const queriesMetierService = QueriesMetierService.create(neo4jDriver, env.NEO4J_DATABASE);
