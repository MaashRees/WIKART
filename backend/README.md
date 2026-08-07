# WIKART - Backend (API Hono/Node)

API REST entre le frontend React et Neo4j AuraDB (le frontend ne peut pas se connecter directement à Aura sans exposer les identifiants dans le navigateur). Auteur : Conambot NGUESSAN.

## Prérequis

- Node.js
- Les mêmes identifiants Neo4j AuraDB que `database/` (même instance)

## Setup

```bash
cd backend
cp .env.example .env   # renseigner NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD / NEO4J_DATABASE
npm install
```

## Lancer

```bash
npm run dev      # dev, avec rechargement à chaud - http://localhost:3000
npm run build     # compile en JS (dist/)
npm run start     # lance la version compilée
```

Toutes les routes sont préfixées par `/api`. Les slashes finaux sont normalisés (`/api/musees/` redirige vers `/api/musees`).

## Routes

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/artistes/chaine-influence?depart=&arrivee=` | Plus court chemin d'influence entre deux artistes |
| GET | `/api/artistes/:artisteNom/repartition-oeuvres` | Répartition des œuvres d'un artiste par musée/région |
| GET | `/api/mouvements/stats` | Statistiques globales (totaux + top mouvements/artistes/musées/décennies/régions) - alimente le Dashboard |
| GET | `/api/mouvements/:mouvement/artistes-centraux?limit=` | Artistes les plus centraux d'un mouvement (degré d'influence) |
| GET | `/api/mouvements/:mouvement/concentration-geographique` | Répartition régionale des œuvres d'un mouvement |
| GET | `/api/mouvements/:mouvement/musees-hubs?limit=` | Musées avec le plus d'œuvres d'un mouvement |
| GET | `/api/musees` | Liste des musées (nom, lat/lon, mouvements représentés) - alimente la carte |
| GET | `/api/oeuvres?page=&limit=` | Liste paginée des œuvres (`page` ≥ 1, `limit` entre 1 et 100, défaut 20) |
| GET | `/api/oeuvres/:reference` | Détail d'une œuvre, par sa `reference` unique |
| POST | `/api/oeuvres` | Création d'une œuvre (démo CRUD web) - la `reference` est générée côté serveur (UUID) |
| PATCH | `/api/oeuvres/:reference` | Modification d'une œuvre |
| DELETE | `/api/oeuvres/:reference` | Suppression d'une œuvre |

Les routes `:mouvement` comparent le nom de mouvement de façon insensible à la
casse (`toLower`). L'identifiant d'une œuvre est sa `reference` (le `titre`
Joconde n'est pas unique - plusieurs œuvres distinctes peuvent partager le même
titre), déjà présente sur les nœuds `Oeuvre` importés (`id_oeuvre` du CSV, cf.
`database/scripts/import_real.py`) et reprise par le CRUD Python
(`database/scripts/admin/crud.py`).

Le CRUD sur `/api/oeuvres` alimente le panneau `CrudDemo` du frontend. **C'est un CRUD distinct** du CRUD Python exigé par le sujet (`database/scripts/admin/crud.py`) - les deux se connectent séparément à AuraDB, l'un ne dépend pas de l'autre (voir [../README.md](../README.md#stack)), mais appliquent la même règle de validation (artiste relié au mouvement + musée existant) avant toute écriture.

## Contenu

- `src/index.ts` - point d'entrée, montage des routes sous `/api`, middleware trailing-slash.
- `src/neo4j.ts` - driver `neo4j-driver` partagé (lit `.env`), `disableLosslessIntegers: true` pour que les `count()`/agrégats Cypher soient sérialisés en nombres JSON classiques plutôt qu'en objets `{low, high}`.
- `src/queries-service.ts` - toutes les requêtes Cypher (les 5 requêtes métier + CRUD œuvres + listing musées).
- `src/routes/` - une route Hono par ressource (`artistes`, `mouvements`, `oeuvres`, `musees`) + `test.ts`.
- `src/validation.ts` - schémas Zod partagés pour la validation des entrées.
