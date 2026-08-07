import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Database,
  PlusCircle,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  creerOeuvre,
  listerOeuvres,
  modifierOeuvre,
  supprimerOeuvre,
} from "../api/queries";

const VIDE = {
  titre: "",
  artiste: "",
  mouvement: "Impressionnisme",
  annee: "1875",
  musee: "",
};

const LIST_LIMIT = 20;

export default function CrudDemo() {
  const [oeuvres, setOeuvres] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [form, setForm] = useState(VIDE);
  const [enEdition, setEnEdition] = useState(null); // original title if editing
  const [message, setMessage] = useState(null);
  const [statusType, setStatusType] = useState("success");
  const [searchFilter, setSearchFilter] = useState("");

  const charger = (search = searchFilter) => {
    setChargement(true);
    listerOeuvres(LIST_LIMIT, search)
      .then((data) => setOeuvres(data || []))
      .catch((err) => {
        setMessage(`Impossible de charger les œuvres : ${err.message}`);
        setStatusType("error");
      })
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      charger(searchFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  const soumettre = async (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.artiste.trim() || !form.musee.trim()) {
      setMessage("Veuillez renseigner le titre, l'artiste et le musée.");
      setStatusType("error");
      return;
    }

    try {
      if (enEdition) {
        await modifierOeuvre(enEdition, {
          artiste: form.artiste,
          mouvement: form.mouvement,
          musee: form.musee,
          annee: form.annee,
        });
        setMessage(`Œuvre "${enEdition}" mise à jour dans Neo4j.`);
      } else {
        await creerOeuvre(form);
        setMessage(`Œuvre "${form.titre}" créée et reliée dans Neo4j.`);
      }
      setStatusType("success");
      setForm(VIDE);
      setEnEdition(null);
      charger(searchFilter);
    } catch (err) {
      setMessage(err.response?.data?.error || err.message);
      setStatusType("error");
    }
  };

  const editer = (oeuvre) => {
    setForm({
      titre: oeuvre.titre,
      artiste: oeuvre.artiste,
      mouvement: oeuvre.mouvement || "Impressionnisme",
      annee: String(oeuvre.annee ?? ""),
      musee: oeuvre.musee,
    });
    setEnEdition(oeuvre.titre);
  };

  const annulerEdition = () => {
    setForm(VIDE);
    setEnEdition(null);
  };

  const supprimer = async (titreOeuvre) => {
    try {
      await supprimerOeuvre(titreOeuvre);
      setMessage(`Œuvre "${titreOeuvre}" supprimée de la base.`);
      setStatusType("info");
      charger(searchFilter);
    } catch (err) {
      setMessage(err.response?.data?.error || err.message);
      setStatusType("error");
    }
  };

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      <div className="glass-card p-6">
        <div className="badge badge-cyan mb-2 inline-flex items-center gap-1.5 text-xs">
          <Database size={13} /> Live Neo4j Cypher Operations — Optimisé
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          Gestion & Démo <span className="gradient-text">CRUD Neo4j</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Insertion, modification et suppression de notices d'œuvres — affichage
          initial limité à {LIST_LIMIT} notices et recherche en temps réel.
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-3 text-sm font-semibold border ${
            statusType === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : statusType === "error"
              ? "bg-red-500/15 border-red-500/30 text-red-400"
              : "bg-sky-500/15 border-sky-500/30 text-sky-400"
          }`}
        >
          {statusType === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <PlusCircle size={18} className="text-indigo-400" />
              {enEdition
                ? `Modifier "${enEdition}"`
                : "Nouvelle Notice d'Œuvre"}
            </h3>

            <form onSubmit={soumettre} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Titre de l'œuvre *
                </label>
                <input
                  className="input-field w-full text-sm px-3.5 py-2"
                  value={form.titre}
                  disabled={!!enEdition}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, titre: e.target.value }))
                  }
                  placeholder="Ex. Le Bassin aux nymphéas"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Auteur / Artiste *
                </label>
                <input
                  className="input-field w-full text-sm px-3.5 py-2"
                  value={form.artiste}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, artiste: e.target.value }))
                  }
                  placeholder="Ex. Claude Monet"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Mouvement artistique
                </label>
                <select
                  className="input-field select-field w-full text-sm px-3.5 py-2 bg-slate-900"
                  value={form.mouvement}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mouvement: e.target.value }))
                  }
                >
                  <option value="Impressionnisme">Impressionnisme</option>
                  <option value="Post-impressionnisme">
                    Post-impressionnisme
                  </option>
                  <option value="Renaissance">Renaissance</option>
                  <option value="Art nouveau">Art nouveau</option>
                  <option value="Cubisme">Cubisme</option>
                  <option value="Symbolisme">Symbolisme</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Année de création
                </label>
                <input
                  className="input-field w-full text-sm px-3.5 py-2"
                  type="number"
                  value={form.annee}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, annee: e.target.value }))
                  }
                  placeholder="1875"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Musée d'exposition *
                </label>
                <input
                  className="input-field w-full text-sm px-3.5 py-2"
                  value={form.musee}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, musee: e.target.value }))
                  }
                  placeholder="Ex. musée d'Orsay"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="btn btn-primary text-xs py-2.5 px-4 flex-1 flex items-center justify-center gap-2"
                >
                  <PlusCircle size={16} />
                  {enEdition ? "Enregistrer" : "Créer le Nœud (:Oeuvre)"}
                </button>
                {enEdition && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs p-2.5"
                    onClick={annulerEdition}
                    title="Annuler"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Data Table Panel */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Database size={18} className="text-purple-400" />
              Notices enregistrées ({oeuvres.length}/{LIST_LIMIT})
            </h3>
            <div className="relative w-100">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                className="input-field w-full pl-9! pr-3 py-1.5 text-xs"
                placeholder="Rechercher titre, artiste, musée..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          {chargement && (
            <p className="text-slate-400 text-xs">Chargement depuis Neo4j...</p>
          )}

          {!chargement && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold">
                    <th className="p-3">Titre</th>
                    <th className="p-3">Artiste</th>
                    <th className="p-3">Musée</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {oeuvres.map((o, idx) => (
                    <tr
                      key={`${o.titre}-${idx}`}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3 font-bold text-white max-w-xs truncate">
                        {o.titre}
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {o.mouvement || "Non renseigné"} •{" "}
                          {o.annee ?? "Année inconnue"}
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <User size={13} className="text-indigo-400" />{" "}
                          {o.artiste}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 size={13} className="text-cyan-400" />{" "}
                          {o.musee}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="btn btn-secondary px-2.5 py-1 text-[11px]"
                            onClick={() => editer(o)}
                          >
                            Éditer
                          </button>
                          <button
                            className="btn btn-danger p-1 text-[11px]"
                            onClick={() => supprimer(o.titre)}
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {oeuvres.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-4 text-center text-slate-400"
                      >
                        Aucune notice trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
