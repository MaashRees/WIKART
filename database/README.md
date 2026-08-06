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

# 5. GDS PageRank/Louvain — nécessite une session Aura Graph Analytics payante,
#    voir limitation ci-dessous. Ne PAS lancer sans validation budget.
uv run scripts/gds_algorithms.py

# 6. Bloc 3 — administration
uv run scripts/admin/dump_restore.py dump              # sauvegarde JSON dans scripts/admin/dumps/<timestamp>/
uv run scripts/admin/dump_restore.py restore <dossier>  # restauration (idempotent, testé)
uv run scripts/admin/crud.py                             # CRUD Python — livrable séparé du CRUD Express
```

## Limitation connue : GDS (PageRank/Louvain)

Sur AuraDB Free, `gds.graph.project` exige une session **Aura Graph Analytics**
(`gds.session.getOrCreate`) — un produit serverless facturé à l'usage, séparé
du plan Free, avec une taille minimale de 2 Go même pour notre réseau
d'influence (54 relations, 313 Ko). Ce n'est pas un problème de volumétrie,
c'est une contrainte de plateforme découverte en cours de projet.

**Décision d'équipe** : ne pas payer. Repli appliqué (prévu dans le plan de
repli, section 4.3 de `Repartition-Taches-Journee.md`) :
- Centralité → degré d'influence en Cypher pur (`artistes_centraux_mouvement`
  dans `queries_metier.py`).
- Chaîne d'influence → `shortestPath` en Cypher pur (`chaine_influence`).
- Louvain (communautés) → non substitué, capacité absente de cette V1,
  documentée plutôt que masquée.

`scripts/gds_algorithms.py` reste écrit et prêt à l'emploi si l'équipe décide
de payer une session ponctuelle (ex. pour la soutenance).

## Bloc 3 — administration

- `scripts/admin/dump_restore.py` — dump/restore **portable via le driver
  Python uniquement** (pas de `neo4j-admin`, indisponible sur AuraDB Free).
  Export JSON par lot de tous les nœuds/relations, restore par `MERGE`
  (testé idempotent : un restore sur une base déjà peuplée ne duplique rien).
  Sortie dans `scripts/admin/dumps/` (gitignored, jamais commité).
- `scripts/admin/crud.py` — **CRUD Python**, livrable séparé exigé par le
  sujet, driver `neo4j` direct (indépendant du CRUD Express de Conambot).
  Démo sur un nœud `Oeuvre` préfixé `DEMO-CRUD-`, auto-nettoyée en fin de script.
- `scripts/admin/SECURITE.md` — bonnes pratiques et limites connues
  (pas de RBAC granulaire sur AuraDB Free).

## Contenu

- `schema/constraints.cypher` — contraintes d'unicité (`Oeuvre.reference`, `Musee.code_museofile`,
  `Artiste.nom`, `MouvementArtistique.nom`, `Ville` en clé composite, `Departement`/`Region`)
  + index de performance (`Oeuvre.annee_creation`, `Artiste.label_wikidata`, `Musee.nom`).
- `scripts/connection.py` — connexion partagée au driver `neo4j` (lit `.env`).
- `scripts/setup_constraints.py` — applique `schema/constraints.cypher`.
- `scripts/import_sample.py` — jeu de données **fictif** (Bloc 1, gardé pour tests rapides).
- `scripts/import_real.py` — **import réel** (Bloc 2) : vide le graphe puis importe les 137k
  œuvres + 38 798 artistes + mouvements + influences depuis `data/`. Décisions de modélisation
  documentées en tête de fichier (dédup artiste, rattachement mouvement/influence à l'Artiste,
  routage des influenceurs non-personnes vers `:Concept`).
- `scripts/queries_metier.py` — les 5 requêtes Cypher métier (section 1 de la proposition),
  chacune exposée comme fonction réutilisable par l'API Express de Conambot.
- `data/` — export réel livré par Seer (`oeuvres_clean.csv` et fichiers Wikidata associés).
