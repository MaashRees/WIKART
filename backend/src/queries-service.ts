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

  async repartitionOeuvresArtiste(artisteNom: string) {
    const query = `
      MATCH (a:Artiste {nom: $artisteNom})-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
          -[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
      RETURN m.nom AS musee, r.nom AS region, count(o) AS nb_oeuvres
      ORDER BY nb_oeuvres DESC
    `;
    return this.runQuery<{ musee: string; region: string; nb_oeuvres: number }>(query, { artisteNom });
  }
}

export const queriesMetierService = QueriesMetierService.create(neo4jDriver, env.NEO4J_DATABASE);