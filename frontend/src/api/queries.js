import client from "./client";

// --- Dashboard & Stats ---
export const getDashboardStats = () =>
  client.get("/mouvements/stats").then((r) => r.data);

// --- Artistes ---
export const getChaineInfluence = (depart, arrivee) =>
  client
    .get("/artistes/chaine-influence", { params: { depart, arrivee } })
    .then((r) => r.data);

export const getRepartitionOeuvres = (artisteNom) =>
  client
    .get(`/artistes/${encodeURIComponent(artisteNom)}/repartition-oeuvres`)
    .then((r) => r.data);

// --- Mouvements ---
export const getArtistesCentraux = (mouvement, limit = 10) =>
  client
    .get(`/mouvements/${encodeURIComponent(mouvement)}/artistes-centraux`, {
      params: { limit },
    })
    .then((r) => r.data);

export const getConcentrationGeo = (mouvement) =>
  client
    .get(
      `/mouvements/${encodeURIComponent(mouvement)}/concentration-geographique`,
    )
    .then((r) => r.data);

export const getMuseesHubs = (mouvement, limit = 10) =>
  client
    .get(`/mouvements/${encodeURIComponent(mouvement)}/musees-hubs`, {
      params: { limit },
    })
    .then((r) => r.data);

// --- Œuvres (CRUD) ---
export const listerOeuvres = (limit = 50, search = "") =>
  client
    .get("/oeuvres", { params: { limit, search } })
    .then((r) => r.data);

export const getOeuvre = (titre) =>
  client.get(`/oeuvres/${encodeURIComponent(titre)}`).then((r) => r.data);

export const creerOeuvre = (oeuvre) =>
  client.post("/oeuvres", oeuvre).then((r) => r.data);

export const modifierOeuvre = (titre, oeuvre) =>
  client
    .patch(`/oeuvres/${encodeURIComponent(titre)}`, oeuvre)
    .then((r) => r.data);

export const supprimerOeuvre = (titre) =>
  client.delete(`/oeuvres/${encodeURIComponent(titre)}`).then((r) => r.data);

// --- Musées ---
export const getMusees = () => client.get("/musees").then((r) => r.data);
