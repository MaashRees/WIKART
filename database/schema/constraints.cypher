// WIKART - Contraintes d'unicité + index Neo4j
// À exécuter une seule fois sur une base vide (idempotent grâce à IF NOT EXISTS).
// Clés choisies en fonction des données réelles livrées par Seer (voir ../data/README.md).

// --- Oeuvre ---
// id_oeuvre : clé stable de la notice Joconde, 0 doublon vérifié par Seer.
CREATE CONSTRAINT oeuvre_reference_unique IF NOT EXISTS
FOR (o:Oeuvre) REQUIRE o.reference IS UNIQUE;

// --- Musee ---
// code_museofile : identifiant officiel Ministère de la Culture, fiable à 100%.
CREATE CONSTRAINT musee_code_unique IF NOT EXISTS
FOR (m:Musee) REQUIRE m.code_museofile IS UNIQUE;

// --- Artiste ---
// nom = segment individuel de auteur_brut (après split sur ';' et trim).
// Pas de dédoublonnage fuzzy automatique (choix de Seer) : deux graphies
// différentes du même artiste réel (ex. "Monet Claude (1840-1926)" vs
// "MONET Claude Oscar") restent deux nœuds distincts - limite assumée et
// documentée plutôt que fusionnée à l'aveugle.
CREATE CONSTRAINT artiste_nom_unique IF NOT EXISTS
FOR (a:Artiste) REQUIRE a.nom IS UNIQUE;

// --- MouvementArtistique ---
// nom = label Wikidata du mouvement (artistes_mouvement.csv), pas Epoque (trop sparse/peu fiable).
CREATE CONSTRAINT mouvement_nom_unique IF NOT EXISTS
FOR (mv:MouvementArtistique) REQUIRE mv.nom IS UNIQUE;

// --- Hiérarchie géographique ---
// Ville : clé composite (nom, departement) pour éviter de fusionner deux
// communes homonymes de départements différents.
CREATE CONSTRAINT ville_key IF NOT EXISTS
FOR (v:Ville) REQUIRE (v.nom, v.departement) IS NODE KEY;

// Departement et Region : uniques en France, pas d'ambiguïté de graphie
// (déjà normalisées par Seer : Île-de-France / Provence-Alpes-Côte d'Azur).
CREATE CONSTRAINT departement_nom_unique IF NOT EXISTS
FOR (d:Departement) REQUIRE d.nom IS UNIQUE;

CREATE CONSTRAINT region_nom_unique IF NOT EXISTS
FOR (r:Region) REQUIRE r.nom IS UNIQUE;

// --- Index de performance (hors clés déjà indexées par les contraintes ci-dessus) ---

// Filtrage temporel pour les requêtes métier (répartition par période).
CREATE RANGE INDEX oeuvre_annee_creation IF NOT EXISTS
FOR (o:Oeuvre) ON (o.annee_creation);

// Recherche d'artiste par label Wikidata canonique (quand disponible),
// utilisé pour joindre vers INFLUENCE_PAR / APPARTIENT_AU_MOUVEMENT.
CREATE RANGE INDEX artiste_label_wikidata IF NOT EXISTS
FOR (a:Artiste) ON (a.label_wikidata);

// Recherche de musée par nom (écran "Explorateur" de la WebApp).
CREATE RANGE INDEX musee_nom IF NOT EXISTS
FOR (m:Musee) ON (m.nom);

// --- Concept ---
// Certaines entrées INFLUENCE_PAR de Wikidata pointent vers un concept/mouvement
// non-personne (ex. "Sculpture africaine" pour Picasso) plutôt qu'un artiste.
// Routé vers un type de nœud séparé plutôt que de créer un Artiste "fantôme".
CREATE CONSTRAINT concept_nom_unique IF NOT EXISTS
FOR (c:Concept) REQUIRE c.nom IS UNIQUE;
