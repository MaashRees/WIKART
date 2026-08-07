import { Building2, Filter, MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";
import { getMusees } from "../api/queries";
import MuseumMap from "../components/MuseumMap";

export default function MuseumMapPage() {
  const [musees, setMusees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [mouvementFiltre, setMouvementFiltre] = useState("Tous");

  useEffect(() => {
    getMusees()
      .then((data) => {
        // Filter out items without valid GPS coordinates
        const valid = (data || []).filter(
          (m) =>
            typeof m.lat === "number" &&
            typeof m.lon === "number" &&
            !isNaN(m.lat) &&
            !isNaN(m.lon),
        );
        setMusees(valid);
      })
      .catch((err) => setErreur(err.message))
      .finally(() => setLoading(false));
  }, []);

  const mouvementsTop = [
    "Tous",
    ...Array.from(
      new Set(
        musees.flatMap((m) =>
          (m.mouvements || []).filter((mov) => mov && mov.trim()),
        ),
      ),
    ).sort((a, b) => a.localeCompare(b, "fr")),
  ];

  const museesFiltres =
    mouvementFiltre === "Tous"
      ? musees
      : musees.filter((m) =>
          (m.mouvements || []).some(
            (mov) =>
              mov && mov.toLowerCase().includes(mouvementFiltre.toLowerCase()),
          ),
        );

  if (loading)
    return (
      <div className="page-container text-slate-400">
        Chargement de la géolocalisation des musées depuis Neo4j...
      </div>
    );
  if (erreur)
    return (
      <div className="page-container text-red-400">
        Erreur lors du chargement des musées : {erreur}
      </div>
    );

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="badge badge-cyan mb-2 inline-flex items-center gap-1.5 text-xs">
              <MapPin size={13} /> Geolocation & Spatial Distribution — Base
              Joconde Neo4j
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              Cartographie des{" "}
              <span className="gradient-text">Musées de France</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Localisation géographique réelle des 450+ établissements
              détenteurs et maillage territorial des mouvements.
            </p>
          </div>

          <div className="flex gap-2.5 items-center">
            <div className="badge badge-purple px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
              <Building2 size={14} /> {museesFiltres.length} / {musees.length}{" "}
              musées
            </div>
          </div>
        </div>
      </div>

      {/* Movement Filter List */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold shrink-0">
            <Filter size={15} /> Filtrer par mouvement :
          </div>

          <label className="flex items-center gap-2 min-w-[280px] max-w-full flex-1">
            <span className="sr-only">Choisir un mouvement</span>
            <select
              value={mouvementFiltre}
              onChange={(e) => setMouvementFiltre(e.target.value)}
              className="input-field w-full text-xs px-3 py-2 bg-slate-900"
            >
              {mouvementsTop.map((m) => {
                const count =
                  m === "Tous"
                    ? musees.length
                    : musees.filter((mus) =>
                        (mus.mouvements || []).some(
                          (mov) =>
                            mov && mov.toLowerCase().includes(m.toLowerCase()),
                        ),
                      ).length;

                return (
                  <option key={m} value={m}>
                    {m} ({count})
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      </div>

      {/* Map & Museum List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map view */}
        <div className="lg:col-span-2">
          <MuseumMap musees={museesFiltres} />
        </div>

        {/* Sidebar list of museums */}
        <div className="glass-card p-5 flex flex-col gap-4">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Navigation size={18} className="text-cyan-400" />
            Établissements ({museesFiltres.length})
          </h3>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[500px] pr-1">
            {museesFiltres.map((mus, idx) => (
              <div
                key={`${mus.nom}-${idx}`}
                className="p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="font-bold text-white text-sm mb-1">
                  {mus.nom}
                </div>
                <div className="text-[11px] text-slate-400 mb-2">
                  GPS: {mus.lat.toFixed(3)}, {mus.lon.toFixed(3)}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(mus.mouvements || [])
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((mov) => (
                      <span
                        key={mov}
                        className="badge badge-purple text-[10px] px-2 py-0.5"
                      >
                        {mov}
                      </span>
                    ))}
                  {(mus.mouvements || []).filter(Boolean).length > 3 && (
                    <span className="badge badge-cyan text-[10px] px-1.5 py-0.5">
                      +{(mus.mouvements || []).filter(Boolean).length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
