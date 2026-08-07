# WIKART

Projet final NoSQL & Big Data (IPSSI) - graphe **Neo4j AuraDB** des musées, artistes et œuvres de France (base **Joconde**, Ministère de la Culture, complétée par **Wikidata**).

**Problématique** : peut-on cartographier les réseaux d'influence entre artistes et les relier à la géographie des œuvres exposées, pour faire émerger des "familles artistiques" et leur diffusion territoriale ?

Formateur : Sayf Bejaoui.

## Équipe

| Personne | Rôle |
|---|---|
| **Seer Mensah Assiakoley** | Données - extraction & nettoyage Joconde, rapprochement Wikidata, rapport analytique |
| **Rémi Korzeniowski** | Base de données - modélisation Neo4j, import, requêtes Cypher, GDS, scripts d'administration |
| **Conambot Nguessan** | Backend - API |
| **Julie Saint Martin** | Frontend - React + Vite, visualisation, déploiement |

## Stack

```
React + Vite (frontend)
        │  axios
        ▼
API backend Hono/Node (TypeScript)
        │  neo4j-driver
        ▼
Neo4j AuraDB  ◄── import Python (Joconde + Wikidata)
```

Le frontend ne peut pas se connecter directement à AuraDB (il faudrait exposer les identifiants dans le navigateur) : le backend est donc l'intermédiaire obligatoire entre React et la base.

## Structure du repo

```
data/              CSV nettoyés (source de vérité pour l'import Neo4j) + dictionnaire de données
notebooks/         Exploration EDA, scripts d'extraction/nettoyage, notebook analytique livrable
database/          Schéma Cypher, scripts d'import et requêtes métier Python (driver neo4j)
backend/           API Hono/TypeScript (routes artistes/mouvements/œuvres/musées + CRUD)
frontend/          React + Vite (dashboard, explorateur de réseau, carte, questions métier, CRUD)
```

## Lancer le projet

### 1. Base de données (Neo4j AuraDB)

```bash
cd database
cp .env.example .env   # renseigner NEO4J_URI / USERNAME / PASSWORD
uv sync

uv run scripts/setup_constraints.py     # contraintes d'unicité + index
uv run scripts/import_real.py           # import complet (ou --no-wipe / --append pour ne pas vider la base)
uv run scripts/queries_metier.py        # les 5 requêtes Cypher métier
uv run scripts/admin/crud.py            # CRUD Python (livrable séparé, indépendant du backend)
uv run scripts/admin/dump_restore.py dump   # dump/restore de la base (scripts d'administration)
```

GDS (PageRank/Louvain) : script prêt (`scripts/gds_algorithms.py`) mais non exécuté par défaut - nécessite une session Aura Graph Analytics payante, absente d'AuraDB Free. Repli documenté : centralité par degré + `shortestPath`.

Détails dans [database/README.md](database/README.md).

### 2. Backend (API)

```bash
cd backend
cp .env.example .env   # mêmes identifiants Neo4j que ci-dessus
npm install
npm run dev             # http://localhost:3000
```

Détails dans [backend/README.md](backend/README.md).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Détails dans [frontend/README.md](frontend/README.md).

**Statut actuel** : toutes les pages (`Dashboard`, `ArtistExplorer`, `BusinessQuestions`, `MuseumMapPage`, `CrudDemo`) sont branchées sur l'API réelle (`src/api/queries.js`). `src/api/mocks.js` n'est plus utilisé nulle part (candidat à la suppression). Le `Dashboard` appelle `GET /api/mouvements/stats`, ajoutée côté backend pour fournir les totaux et le top mouvements/artistes/musées/décennies/régions. Le CRUD `Oeuvre` (backend et Python) identifie désormais une œuvre par sa `reference` unique plutôt que par son `titre` (non unique dans Joconde), et `GET /api/oeuvres` est paginé (`page`/`limit`).

### 4. Notebooks (données & rapport analytique)

```bash
cd notebooks
uv venv -p 3.11 .venv
uv sync

uv run jupyter notebook rapport_analytique.ipynb   # livrable : ETL / requêtes / graphiques
```

`eda_joconde.ipynb` et les scripts d'extraction (`build_clean_csv.py`, `scrape_wikidata_artistes.py`) nécessitent le fichier brut `joconde.csv` (1,1 Go, non versionné) - non nécessaire pour rejouer `rapport_analytique.ipynb`, qui travaille sur les CSV déjà nettoyés dans `data/`. Détails dans [notebooks/README.md](notebooks/README.md).

## Données

137 474 œuvres nettoyées (peinture/sculpture/beaux-arts, auteurs anonymes exclus) sur les ~1,03M notices brutes de Joconde, complétées par Wikidata sur les 10 000 artistes les plus fréquents (5 250 trouvés, 700 relations d'influence, 1 706 rattachements de mouvement - couverture de 78,5% du corpus). Dictionnaire de données complet dans [data/README.md](data/README.md).
