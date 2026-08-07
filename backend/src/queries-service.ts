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
			MATCH (a:Artiste), (b:Artiste)
			WHERE toLower(a.label_wikidata) = toLower($depart)
				AND toLower(b.label_wikidata) = toLower($arrivee)
			
			MATCH p = shortestPath((a)-[:INFLUENCE_PAR*1..6]-(b))
			
			RETURN [n IN nodes(p) | coalesce(n.label_wikidata, n.nom)] AS chaine, 
						 toInteger(length(p)) AS nb_sauts
		`;
		
		const results = await this.runQuery<{ chaine: string[]; nb_sauts: number }>(query, { 
			depart: depart.trim(), 
			arrivee: arrivee.trim() 
		});
	
		return results; // Renvoie null proprement si aucun chemin n'est trouvé
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
		// On nettoie la chaîne et on extrait chaque mot (ex: "Ibels Henri-Gabriel" -> ["ibels", "henri-gabriel"])
		const mots = artisteNom
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter(m => m.length > 0);
	
		const query = `
			MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)
			// Vérifie que chaque mot envoyé est bien présent dans a.nom
			WHERE ALL(mot IN $mots WHERE toLower(a.nom) CONTAINS mot)
			
			OPTIONAL MATCH (o)-[:EXPOSEE_A]->(m:Musee)
			OPTIONAL MATCH (m)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
			
			RETURN coalesce(elementId(m), 'sans-musee') AS id,
						 coalesce(m.nom, 'Non exposée / Musée inconnu') AS musee, 
						 coalesce(r.nom, 'Région inconnue') AS region, 
						 toFloat(count(DISTINCT o)) AS nb_oeuvres
			ORDER BY nb_oeuvres DESC
		`;
	
		return this.runQuery<{ id: string; musee: string; region: string; nb_oeuvres: number }>(query, { mots });
	}

  async listerOeuvres(page: number = 1, limit: number = 20) {
    const query = `
      MATCH (a:Artiste)-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(m:Musee)
      MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      RETURN elementId(o) AS id, o.titre AS titre, o.reference AS reference,
        toFloat(o.annee_creation) AS annee_creation, toFloat(o.annee_creation) AS annee,
        coalesce(o.domaine, []) AS domaine, coalesce(o.ecole_pays, []) AS ecole_pays,
        o.materiaux_techniques AS materiaux_techniques, o.mesures AS mesures,
        a.nom AS artiste, head(collect(mv.nom)) AS mouvement, m.nom AS musee
      ORDER BY o.titre
      SKIP $skip
      LIMIT $limit
    `;
    return this.runQuery<Oeuvre>(query, {
      skip: int((page - 1) * limit),
      limit: int(limit),
    });
  }

  async compterOeuvres() {
    const query = `
      MATCH (o:Oeuvre)
      RETURN toFloat(count(o)) AS total
    `;
    const [result] = await this.runQuery<{ total: number }>(query);
    return result?.total ?? 0;
  }

	async trouverOeuvre(reference: string) {
    const query = `
      MATCH (o:Oeuvre {reference: $reference})
      OPTIONAL MATCH (a:Artiste)-[:A_CREE]->(o)
      OPTIONAL MATCH (o)-[:EXPOSEE_A]->(m:Musee)
      OPTIONAL MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique)
      WITH o, a, m, collect(mv.nom) AS mouvements
      RETURN elementId(o) AS id, 
             o.titre AS titre, 
             o.reference AS reference,
             toFloat(o.annee_creation) AS annee_creation, 
             toFloat(o.annee_creation) AS annee,
             coalesce(o.domaine, []) AS domaine, 
             coalesce(o.ecole_pays, []) AS ecole_pays,
             o.materiaux_techniques AS materiaux_techniques, 
             o.mesures AS mesures,
             a.nom AS artiste, 
             head(mouvements) AS mouvement, 
             m.nom AS musee
    `;
    const [oeuvre] = await this.runQuery<Oeuvre>(query, { reference });
    return oeuvre;
  }
	
	async oeuvreExiste(reference: string) {
		const query = `
			MATCH (o:Oeuvre)
			WHERE o.reference = $reference
			RETURN o.titre AS titre
		`;
		const result = await this.runQuery<{ titre: string }>(query, { reference });
		return result.length > 0;
	}

	async peutRelierOeuvre(artiste: string, mouvement: string, musee: string) {
		const query = `
			MATCH (a:Artiste)
			WHERE toLower(coalesce(a.nom, a.label_wikidata, '')) CONTAINS toLower($artiste)
			
			MATCH (mv:MouvementArtistique)
			WHERE toLower(mv.nom) CONTAINS toLower($mouvement)
			
			MATCH (m:Musee)
			WHERE toLower(m.nom) CONTAINS toLower($musee)
			
			MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
			
			RETURN elementId(a) AS id
			LIMIT 1
		`;
		const result = await this.runQuery(query, { artiste, mouvement, musee });
		return result.length > 0;
	}

  async creerOeuvre(oeuvre: OeuvreInput) {
    const query = `
      MATCH (a:Artiste {nom: $artiste})-[:APPARTIENT_AU_MOUVEMENT]->(mv:MouvementArtistique {nom: $mouvement})
      MATCH (m:Musee {nom: $musee})
      CREATE (o:Oeuvre {titre: $titre, annee_creation: $annee})
      CREATE (a)-[:A_CREE]->(o)
      CREATE (o)-[:EXPOSEE_A]->(m)
      RETURN elementId(o) AS id, o.titre AS titre, o.reference AS reference,
        toFloat(o.annee_creation) AS annee_creation, toFloat(o.annee_creation) AS annee,
        coalesce(o.domaine, []) AS domaine, coalesce(o.ecole_pays, []) AS ecole_pays,
        o.materiaux_techniques AS materiaux_techniques, o.mesures AS mesures,
        a.nom AS artiste, mv.nom AS mouvement, m.nom AS musee
    `;
    const [created] = await this.runQuery<Oeuvre>(query, oeuvre);
    return created;
  }

	async creerOeuvre2(oeuvre: OeuvreInput) {
		const query = `
			// 1. Trouver l'artiste, le musée et le mouvement (avec tolérance sur le nom/casse)
			MATCH (a:Artiste) 
				WHERE toLower(coalesce(a.nom, a.label_wikidata, '')) CONTAINS toLower($artiste)
			MATCH (m:Musee) 
				WHERE toLower(m.nom) CONTAINS toLower($musee)
			MATCH (mv:MouvementArtistique) 
				WHERE toLower(mv.nom) = toLower($mouvement)
			
			// 2. S'assurer que l'artiste appartient bien au mouvement
			MATCH (a)-[:APPARTIENT_AU_MOUVEMENT]->(mv)
			
			// 3. Créer l'œuvre et ses relations seulement si les MATCH ci-dessus ont réussi
			CREATE (o:Oeuvre {
				titre: $titre,
				annee_creation: $annee
			})
			CREATE (a)-[:A_CREE]->(o)
			CREATE (o)-[:EXPOSEE_A]->(m)
			
			RETURN elementId(o) AS id, o.titre AS titre
		`;
	
		const [created] = await this.runQuery(query, oeuvre);
		return created || null; // Renvoie null si la création a échoué (entités introuvables)
	}

  async modifierOeuvre(reference: string, oeuvre: Omit<OeuvreInput, 'titre'>) {
    const query = `
      MATCH (o:Oeuvre)
      WHERE o.reference = $reference
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
      RETURN elementId(o) AS id, o.titre AS titre, o.reference AS reference,
        toFloat(o.annee_creation) AS annee_creation, toFloat(o.annee_creation) AS annee,
        coalesce(o.domaine, []) AS domaine, coalesce(o.ecole_pays, []) AS ecole_pays,
        o.materiaux_techniques AS materiaux_techniques, o.mesures AS mesures,
        a.nom AS artiste, mv.nom AS mouvement, m.nom AS musee
    `;
    const [updated] = await this.runQuery<Oeuvre>(query, { reference, ...oeuvre });
    return updated;
  }

  async supprimerOeuvre(reference: string) {
    const query = `
      MATCH (o:Oeuvre)
      WHERE o.reference = $reference
      DETACH DELETE o
      RETURN $reference AS reference
    `;
    const [deleted] = await this.runQuery<{ reference: string }>(query, { reference });
    return deleted;
  }
}

export type Oeuvre = {
  id: string;
  titre: string;
  reference: string | null;
  annee_creation: number | null;
  artiste: string;
  mouvement: string | null;
  annee: number | null;
  musee: string;
  domaine: string[];
  ecole_pays: string[];
  materiaux_techniques: string | null;
  mesures: string | null;
};

export type Musee = {
  nom: string;
  lat: number | null;
  lon: number | null;
  mouvements: string[];
};

export type OeuvreInput = {
  titre: string;
  artiste: string;
  mouvement: string;
  annee: number | null;
  musee: string;
};

export const queriesMetierService = QueriesMetierService.create(neo4jDriver, env.NEO4J_DATABASE);