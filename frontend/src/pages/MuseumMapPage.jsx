import { Building2, Filter, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { mockMusees } from "../api/mocks";
import MuseumMap from "../components/MuseumMap";

export default function MuseumMapPage() {
  const [mouvementFiltre, setMouvementFiltre] = useState("Tous");

  // Richer simulated museum mock dataset for map
  const enrichedMusees = [
    ...mockMusees,
    {
      nom: "Musée d'Orsay",
      lat: 48.86,
      lon: 2.3266,
      mouvements: ["Impressionnisme", "Post-impressionnisme"],
    },
    {
      nom: "Musée des Beaux-Arts de Lyon",
      lat: 45.7675,
      lon: 4.8336,
      mouvements: ["Renaissance", "Impressionnisme"],
    },
    {
      nom: "Musée d'Art Moderne de Lille",
      lat: 50.6365,
      lon: 3.1478,
      mouvements: ["Cubisme", "Art nouveau"],
    },
    {
      nom: "Musée des Beaux-Arts de Rouen",
      lat: 49.4444,
      lon: 1.0942,
      mouvements: ["Impressionnisme"],
    },
  ];

  const mouvements = [
    "Tous",
    ...new Set(enrichedMusees.flatMap((m) => m.mouvements)),
  ];

  const museesFiltres =
    mouvementFiltre === "Tous"
      ? enrichedMusees
      : enrichedMusees.filter((m) => m.mouvements.includes(mouvementFiltre));

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card" style={{ padding: "24px 28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div className="badge badge-cyan" style={{ marginBottom: 8 }}>
              <MapPin size={12} /> Geolocation & Spatial Distribution — Joconde
            </div>
            <h1
              className="font-display"
              style={{ fontSize: "2.1rem", margin: 0 }}
            >
              Cartographie des{" "}
              <span className="gradient-text">Musées de France</span>
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.92rem",
                marginTop: 4,
              }}
            >
              Localisation des établissements détenteurs et rattachement
              territorial des courants artistiques.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              className="badge badge-purple"
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              <Building2 size={14} /> {museesFiltres.length} musées affichés
            </div>
          </div>
        </div>
      </div>

      {/* Movement Filter Pills Bar */}
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-muted)",
              fontSize: "0.88rem",
              fontWeight: 600,
            }}
          >
            <Filter size={16} /> Mouvement :
          </div>

          {mouvements.map((m) => {
            const count =
              m === "Tous"
                ? enrichedMusees.length
                : enrichedMusees.filter((mus) => mus.mouvements.includes(m))
                    .length;
            const isSelected = mouvementFiltre === m;

            return (
              <button
                key={m}
                onClick={() => setMouvementFiltre(m)}
                className={`btn ${
                  isSelected ? "btn-primary" : "btn-secondary"
                }`}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  borderRadius: 20,
                  boxShadow: isSelected
                    ? "0 0 12px rgba(129, 140, 248, 0.3)"
                    : "none",
                }}
              >
                {m}
                <span
                  style={{
                    background: isSelected
                      ? "rgba(255, 255, 255, 0.25)"
                      : "rgba(255, 255, 255, 0.08)",
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontSize: "0.75rem",
                    marginLeft: 4,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map & Museum List Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* Map view */}
        <MuseumMap musees={museesFiltres} />

        {/* Sidebar list of museums */}
        <div
          className="glass-card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "1.1rem",
            }}
          >
            <Navigation size={18} style={{ color: "var(--accent-cyan)" }} />
            Établissements ({museesFiltres.length})
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
              maxHeight: 460,
            }}
          >
            {museesFiltres.map((mus) => (
              <div
                key={mus.nom}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#fff",
                    fontSize: "0.95rem",
                    marginBottom: 4,
                  }}
                >
                  {mus.nom}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  GPS: {mus.lat.toFixed(3)}, {mus.lon.toFixed(3)}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {mus.mouvements.map((mov) => (
                    <span
                      key={mov}
                      className="badge badge-purple"
                      style={{ fontSize: "0.68rem" }}
                    >
                      {mov}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
