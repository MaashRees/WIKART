# WIKART - Base de données (Neo4j AuraDB)

Setup Bloc 1 (Rémi Korzeniowski) : contraintes/index + import d'un échantillon fictif,
en attendant la vraie livraison de données (Seer Mensah Assiakoley, Bloc 2).

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

# 3. Import réel (Bloc 2)
# - Par défaut : vide le graphe puis importe les 137k œuvres
uv run scripts/import_real.py

# - Option sans vider la base (rajoute ou met à jour les données existantes) :
uv run scripts/import_real.py --no-wipe   # ou --append

# 4. Les 5 requêtes Cypher métier (section 1 de la proposition)
uv run scripts/queries_metier.py

# 5. CRUD Python (livrable séparé exigé par le sujet, indépendant du backend Node)
uv run scripts/admin/crud.py

# 6. Scripts d'administration (Bloc 3)
uv run scripts/admin/dump_restore.py dump              # export JSON dans scripts/admin/dumps/<timestamp>/
uv run scripts/admin/dump_restore.py restore <dossier>  # restore idempotent (MERGE, ne duplique rien)

# 7. GDS (PageRank/Louvain) - non lancé par défaut, voir limitation ci-dessous
uv run scripts/gds_algorithms.py
```

## Contenu

- `schema/constraints.cypher` - contraintes d'unicité (`Oeuvre.reference`, `Musee.code_museofile`,
  `Artiste.nom`, `MouvementArtistique.nom`, `Ville` en clé composite, `Departement`/`Region`)
  + index de performance (`Oeuvre.annee_creation`, `Artiste.label_wikidata`, `Musee.nom`).
- `scripts/connection.py` - connexion partagée au driver `neo4j` (lit `.env`).
- `scripts/setup_constraints.py` - applique `schema/constraints.cypher`.
- `scripts/import_sample.py` - jeu de données **fictif** (Bloc 1, gardé pour tests rapides).
- `scripts/import_real.py` - **import réel** (Bloc 2) : vide le graphe puis importe les 137k
  œuvres + 38 798 artistes + mouvements + influences depuis le dossier `data/` à la racine du projet (`../data/`). Décisions de modélisation
  documentées en tête de fichier (dédup artiste, rattachement mouvement/influence à l'Artiste,
  routage des influenceurs non-personnes vers `:Concept`).
- `scripts/queries_metier.py` - les 5 requêtes Cypher métier (section 1 de la proposition),
  chacune exposée comme fonction réutilisable par l'API de Conambot Nguessan (Hono/Node).
- `../data/` - dossier de données nettoyées situé à la racine du projet (`oeuvres_clean.csv` et fichiers Wikidata associés).
- `scripts/admin/crud.py` - **CRUD Python livrable séparé** (driver `neo4j` direct, indépendant du
  backend Node) : create/read/update/delete sur un nœud `Oeuvre` de démo (préfixe `DEMO-CRUD-`),
  auto-nettoyé en fin de script. La création applique la même validation que le backend
  (`peutRelierOeuvre` dans `backend/src/routes/oeuvres.ts`) : l'artiste doit appartenir au
  mouvement donné et le musée doit exister, sinon `ValueError`.
- `scripts/admin/dump_restore.py` - dump/restore portable via le driver Python (export JSON,
  restore par `MERGE` donc idempotent) - `neo4j-admin dump` n'est pas disponible sur AuraDB Free.
- `scripts/admin/SECURITE.md` - bonnes pratiques `.env`/credentials appliquées et limite de
  RBAC (un seul rôle) documentée pour AuraDB Free.
- `scripts/gds_algorithms.py` - PageRank/Louvain prêts à l'emploi mais **non exécutés par
  défaut** : `gds.graph.project` sur AuraDB Free nécessite une session "Aura Graph Analytics"
  payante (2 Go minimum). Repli documenté et déjà en place : centralité par degré d'influence et
  `shortestPath` dans `queries_metier.py`.
