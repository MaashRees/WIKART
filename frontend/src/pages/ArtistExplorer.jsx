import { Building2, GitCommit, Share2, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { getChaineInfluence, getRepartitionOeuvres } from "../api/queries";
import NetworkGraph from "../components/NetworkGraph";

export default function ArtistExplorer() {
  const [onglet, setOnglet] = useState("repartition"); // "repartition" | "influence"

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      <div className="glass-card p-6">
        <div className="badge badge-purple mb-2 inline-flex items-center gap-1.5 text-xs">
          <UserCheck size={13} /> Nœud Artiste — Neo4j Joconde Graph
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          Explorateur d'Artistes & Réseau d'Influence
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Visualisez la répartition d'un artiste à travers les musées de France ou calculez le plus court chemin d'influence généalogique via Wikidata (P737).
        </p>

        <div className="flex gap-3 mt-4">
          <button
            className={`btn ${
              onglet === "repartition" ? "btn-primary" : "btn-secondary"
            } text-xs px-4 py-2 flex items-center gap-2`}
            onClick={() => setOnglet("repartition")}
          >
            <Building2 size={14} /> Répartition par musée
          </button>
          <button
            className={`btn ${
              onglet === "influence" ? "btn-primary" : "btn-secondary"
            } text-xs px-4 py-2 flex items-center gap-2`}
            onClick={() => setOnglet("influence")}
          >
            <GitCommit size={14} /> Chaîne d'influence
          </button>
        </div>
      </div>

      {onglet === "repartition" ? <RepartitionView /> : <InfluenceView />}
    </div>
  );
}

function RepartitionView() {
  const [nom, setNom] = useState("Claude Monet");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const chercher = async (e) => {
    if (e) e.preventDefault();
    if (!nom.trim()) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await getRepartitionOeuvres(nom.trim());
      setData(res);
    } catch (err) {
      setErreur(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chercher();
  }, []);

  const musees = Array.isArray(data) ? data : [];
  const artistLabel = nom.trim() || "Artiste";

  const nodes = [
    { id: artistLabel, group: "central", label: artistLabel, val: 20 },
    ...musees.map((m) => ({
      id: m.musee,
      group: "musee",
      label: `${m.musee} (${m.nb_oeuvres || m.nb})`,
      val: 8 + Math.min(20, (m.nb_oeuvres || m.nb || 1)),
    })),
  ];
  const links = musees.map((m) => ({
    source: artistLabel,
    target: m.musee,
    label: "EXPOSEE_A",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-5">
        <form onSubmit={chercher} className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1.5 text-xs text-slate-400 font-medium">
            Nom de l'artiste (ex. Claude Monet, Edgar Degas, Renoir)
            <input
              className="input-field w-72 text-sm px-3.5 py-2"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Claude Monet"
            />
          </label>
          <button type="submit" className="btn btn-primary text-xs px-4 py-2.5 flex items-center gap-2">
            <Share2 size={14} /> Explorer le réseau
          </button>
        </form>
      </div>

      {loading && <p className="text-slate-400 text-sm">Recherche dans Neo4j AuraDB...</p>}
      {erreur && <p className="text-red-400 text-sm">{erreur}</p>}

      {data && musees.length > 0 && (
        <>
          <NetworkGraph
            nodes={nodes}
            links={links}
            legend={[
              { label: "Artiste recherché", color: "#c084fc", strong: true },
              { label: "Musée d'exposition", color: "#f472b6" },
            ]}
          />
          <div className="glass-card p-6">
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-purple-400" />
              Répartition par musée ({musees.length} établissement(s))
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {musees.map((m, idx) => (
                <div
                  key={`${m.musee}-${idx}`}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-sm font-semibold text-white block">{m.musee}</span>
                    {m.region && (
                      <span className="text-xs text-slate-400">Région : {m.region}</span>
                    )}
                  </div>
                  <span className="badge badge-cyan text-xs shrink-0">
                    {m.nb_oeuvres || m.nb} œuvre(s)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {data && musees.length === 0 && !loading && (
        <div className="glass-card p-6 text-center text-slate-400">
          Aucune œuvre trouvée pour cet artiste dans la base Joconde. Essayez un autre nom (ex. "Claude Monet", "Edgar Degas", "Eugène Boudin").
        </div>
      )}
    </div>
  );
}

function InfluenceView() {
  const [depart, setDepart] = useState("Eugène Boudin");
  const [arrivee, setArrivee] = useState("Claude Monet");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const chercher = async (e) => {
    if (e) e.preventDefault();
    if (!depart.trim() || !arrivee.trim()) return;
    setLoading(true);
    setErreur(null);
    try {
      const res = await getChaineInfluence(depart.trim(), arrivee.trim());
      setData(res);
    } catch (err) {
      setErreur(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chercher();
  }, []);

  const rawPath = Array.isArray(data) ? data[0]?.chaine || (typeof data[0] === 'string' ? data : []) : data?.chaine || [];
  const chaine = Array.isArray(rawPath) ? rawPath : [];

  const nodes = chaine.map((nomArtiste, i) => ({
    id: nomArtiste,
    group: i === 0 ? "central" : i === chaine.length - 1 ? "cible" : "influence",
    label: nomArtiste,
    val: i === 0 || i === chaine.length - 1 ? 16 : 10,
  }));
  const links = chaine.slice(0, -1).map((nomArtiste, i) => ({
    source: nomArtiste,
    target: chaine[i + 1],
    label: "INFLUENCE_PAR",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-5">
        <form onSubmit={chercher} className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1.5 text-xs text-slate-400 font-medium">
            Artiste de départ
            <input
              className="input-field w-60 text-sm px-3.5 py-2"
              value={depart}
              onChange={(e) => setDepart(e.target.value)}
              placeholder="Ex. Eugène Boudin"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-slate-400 font-medium">
            Artiste d'arrivée
            <input
              className="input-field w-60 text-sm px-3.5 py-2"
              value={arrivee}
              onChange={(e) => setArrivee(e.target.value)}
              placeholder="Ex. Claude Monet"
            />
          </label>
          <button type="submit" className="btn btn-primary text-xs px-4 py-2.5 flex items-center gap-2">
            <GitCommit size={14} /> Trouver le chemin Cypher
          </button>
        </form>
      </div>

      {loading && <p className="text-slate-400 text-sm">Calcul du chemin shortestPath dans Neo4j...</p>}
      {erreur && <p className="text-red-400 text-sm">{erreur}</p>}

      {data && chaine.length > 0 && (
        <>
          <NetworkGraph
            nodes={nodes}
            links={links}
            legend={[
              { label: "Artiste source", color: "#c084fc", strong: true },
              { label: "Intermédiaire", color: "#38bdf8" },
              { label: "Artiste cible", color: "#f472b6" },
            ]}
          />
          <div className="glass-card p-6">
            <h3 className="text-white font-bold text-base mb-3 flex items-center gap-2">
              <GitCommit size={18} className="text-cyan-400" />
              Chaîne d'influence extraite ({chaine.length} étape(s))
            </h3>
            <div className="flex items-center gap-3 overflow-x-auto p-4 rounded-xl bg-slate-950/80 border border-white/10">
              {chaine.map((step, idx) => (
                <div key={`${step}-${idx}`} className="flex items-center gap-3 shrink-0">
                  <div className="px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-center">
                    <span className="badge badge-purple text-[10px] block mb-1">
                      {idx === 0 ? "Source" : idx === chaine.length - 1 ? "Cible" : `Étape ${idx}`}
                    </span>
                    <span className="font-bold text-white text-sm">{step}</span>
                  </div>
                  {idx < chaine.length - 1 && (
                    <div className="flex flex-col items-center text-cyan-400">
                      <span className="text-[10px] text-slate-500 font-semibold mb-0.5">
                        [:INFLUENCE_PAR]
                      </span>
                      <span className="text-lg">→</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {data && chaine.length === 0 && !loading && (
        <div className="glass-card p-6 text-center text-slate-400">
          Aucun chemin d'influence direct trouvé dans Wikidata entre ces deux artistes.
        </div>
      )}
    </div>
  );
}
