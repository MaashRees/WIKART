# WIKART — Base de données (Neo4j AuraDB)

Setup Bloc 1 (Rémi) : contraintes/index + import d'un échantillon fictif,
en attendant la vraie livraison de données (Seer, Bloc 2).

## Prérequis

- [uv](https://docs.astral.sh/uv/) installé
- Une instance **AuraDB Free** créée sur [console.neo4j.io](https://console.neo4j.io) (statut "Running")

## Setup

```bash
cd database
cp .env.example .env   # puis renseigner NEO4J_URI / USERNAME / PASSWORD
uv sync
```

## Lancer

```bash
# 1. Contraintes d'unicité + index (schéma section 3 de la proposition)
uv run scripts/setup_constraints.py

# 2. Échantillon fictif (5 artistes/œuvres/musées, cohérent avec les mocks du frontend)
uv run scripts/import_sample.py

# 3. Import réel (Bloc 2) — vide le graphe puis importe les 137k œuvres de Seer
uv run scripts/import_real.py

# 4. Les 5 requêtes Cypher métier (section 1 de la proposition)
uv run scripts/queries_metier.py
```

## Contenu

- `schema/constraints.cypher` — contraintes d'unicité (`Oeuvre.reference`, `Musee.code_museofile`,
  `Artiste.nom`, `MouvementArtistique.nom`, `Ville` en clé composite, `Departement`/`Region`)
  + index de performance (`Oeuvre.annee_creation`, `Artiste.label_wikidata`, `Musee.nom`).
- `scripts/connection.py` — connexion partagée au driver `neo4j` (lit `.env`).
- `scripts/setup_constraints.py` — applique `schema/constraints.cypher`.
- `scripts/import_sample.py` — jeu de données **fictif** (Bloc 1, gardé pour tests rapides).
- `scripts/import_real.py` — **import réel** (Bloc 2) : vide le graphe puis importe les 137k
  œuvres + 38 798 artistes + mouvements + influences depuis le dossier `data/` à la racine du projet (`../data/`). Décisions de modélisation
  documentées en tête de fichier (dédup artiste, rattachement mouvement/influence à l'Artiste,
  routage des influenceurs non-personnes vers `:Concept`).
- `scripts/queries_metier.py` — les 5 requêtes Cypher métier (section 1 de la proposition),
  chacune exposée comme fonction réutilisable par l'API Express de Conambot.
- `../data/` — dossier de données nettoyées situé à la racine du projet (`oeuvres_clean.csv` et fichiers Wikidata associés).
