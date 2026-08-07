# WIKART - Frontend (React + Vite)

WebApp de démo : dashboard, exploration du réseau d'influence, carte des musées, réponses aux questions métier, panneau CRUD. Auteure : Julie SAINT MARTIN.

## Prérequis

- Node.js
- Le backend (`../backend/`) lancé en local, ou son URL de déploiement

## Setup

```bash
cd frontend
npm install
```

Par défaut, l'app appelle `http://localhost:3000/api` (backend en local). Pour pointer vers une autre URL (backend déployé sur Railway), créer un fichier `.env` :

```
VITE_API_URL=https://<url-du-backend>/api
```

## Lancer

```bash
npm run dev        # dev - http://localhost:5173
npm run build       # build de prod (dist/)
npm run preview     # sert le build de prod en local
npm run lint         # ESLint
```

## Pages

Toutes les pages sont branchées sur l'API réelle (`src/api/queries.js`).

| Route | Page | Appels API |
|---|---|---|
| `/` | `Dashboard` | `GET /api/mouvements/stats` |
| `/explorateur` | `ArtistExplorer` - réseau d'influence d'un artiste | `GET /api/artistes/chaine-influence`, `GET /api/artistes/:artisteNom/repartition-oeuvres` |
| `/carte` | `MuseumMapPage` - carte des musées par mouvement | `GET /api/musees` |
| `/questions` | `BusinessQuestions` - les 5 questions métier | `GET /api/mouvements/:mouvement/artistes-centraux`, `.../concentration-geographique`, `.../musees-hubs`, `GET /api/artistes/...` |
| `/crud` | `CrudDemo` - démo insertion/suppression/mise à jour d'une œuvre, pagination page par page | `GET/POST/PATCH/DELETE /api/oeuvres` |

## Contenu

- `src/api/client.js` - instance `axios` configurée sur `VITE_API_URL` (ou `http://localhost:3000/api` par défaut).
- `src/api/queries.js` - un appel par route backend (voir tableau ci-dessus). Les œuvres sont identifiées par leur `reference` (pas leur `titre`, non unique dans Joconde).
- `src/api/mocks.js` - données factices historiques, **non utilisées** par le code actuel (plus aucune page ne les importe) - conservées pour référence, à supprimer si confirmé inutile.
- `src/components/` - `Layout` (navigation), `NetworkGraph` (`react-force-graph-2d`), `MuseumMap` (`react-leaflet`).
- `src/pages/` - une page par écran (cf. tableau ci-dessus).
