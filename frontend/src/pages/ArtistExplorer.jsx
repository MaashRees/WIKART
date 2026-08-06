import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  ExternalLink,
  Share2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { mockArtiste } from "../api/mocks";
import NetworkGraph from "../components/NetworkGraph";

// Additional simulated artists for rich exploration
const sampleArtists = {
  "Claude Monet": mockArtiste,
  "Edgar Degas": {
    artiste: { nom: "Edgar Degas" },
    oeuvres: [
      { titre: "La Classe de danse", annee: 1874, musee: "Musée d'Orsay" },
      { titre: "L'Absinthe", annee: 1876, musee: "Musée d'Orsay" },
    ],
    influences: [
      { nom: "Jean-Auguste-Dominique Ingres" },
      { nom: "Édouard Manet" },
    ],
  },
  "Auguste Renoir": {
    artiste: { nom: "Auguste Renoir" },
    oeuvres: [
      {
        titre: "Bal du moulin de la Galette",
        annee: 1876,
        musee: "Musée d'Orsay",
      },
      {
        titre: "Le Déjeuner des canotiers",
        annee: 1881,
        musee: "The Phillips Collection",
      },
    ],
    influences: [{ nom: "Gustave Courbet" }, { nom: "Claude Monet" }],
  },
};

export default function ArtistExplorer() {
  const [selectedName, setSelectedName] = useState("Claude Monet");
  const artiste = sampleArtists[selectedName] || mockArtiste;

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      {/* Header & Artist Selector */}
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
            <div className="badge badge-purple" style={{ marginBottom: 8 }}>
              <UserCheck size={12} /> Nœud Artiste - Neo4j Joconde Graph
            </div>
            <h1
              className="font-display"
              style={{ fontSize: "2.1rem", margin: 0 }}
            >
              {artiste.artiste.nom}
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.92rem",
                marginTop: 4,
              }}
            >
              Mouvement :{" "}
              <span
                style={{ color: "var(--accent-secondary)", fontWeight: 600 }}
              >
                Impressionnisme
              </span>{" "}
              • Graph Degree :{" "}
              <span style={{ color: "#fff", fontWeight: 600 }}>
                {artiste.oeuvres.length + artiste.influences.length} connections
              </span>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              Changer d'artiste :
            </label>
            <select
              className="input-field select-field"
              style={{
                width: 220,
                background: "rgba(10, 12, 20, 0.9)",
                padding: "8px 14px",
              }}
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
            >
              {Object.keys(sampleArtists).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Network Graph Section */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Share2 size={18} style={{ color: "var(--accent-primary)" }} />
            Graphe de réseau 2D
          </h2>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Navigation dynamique • Glissez-déposez les nœuds
          </span>
        </div>
        <NetworkGraph artiste={artiste} />
      </div>

      {/* Details Grid: Oeuvres & Influences */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 20,
        }}
      >
        {/* Oeuvres list */}
        <div className="glass-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "1.1rem",
              }}
            >
              <BookOpen size={18} style={{ color: "var(--accent-pink)" }} />
              Œuvres conservées ({artiste.oeuvres.length})
            </h3>
            <span className="badge badge-purple">(:A_CREE)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {artiste.oeuvres.map((o) => (
              <div
                key={o.titre}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <h4
                    style={{
                      fontSize: "0.98rem",
                      color: "#fff",
                      marginBottom: 4,
                    }}
                  >
                    {o.titre}
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Calendar size={13} /> {o.annee}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Building2 size={13} /> {o.musee}
                    </span>
                  </div>
                </div>

                <div
                  className="badge badge-cyan"
                  style={{ fontSize: "0.7rem", flexShrink: 0 }}
                >
                  Exposée
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Influences List */}
        <div className="glass-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "1.1rem",
              }}
            >
              <Sparkles size={18} style={{ color: "var(--accent-cyan)" }} />
              Influencé par ({artiste.influences.length})
            </h3>
            <span className="badge badge-cyan">Wikidata P737</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {artiste.influences.map((inf) => (
              <div
                key={inf.nom}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {inf.nom[0]}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", color: "#fff" }}>
                      {inf.nom}
                    </h4>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Relation : [:INFLUENCE_PAR]
                    </span>
                  </div>
                </div>

                {sampleArtists[inf.nom] ? (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                    onClick={() => setSelectedName(inf.nom)}
                  >
                    Explorer <ArrowRight size={14} />
                  </button>
                ) : (
                  <a
                    href={`https://fr.wikipedia.org/wiki/${encodeURIComponent(
                      inf.nom,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.8rem",
                      textDecoration: "none",
                    }}
                  >
                    Wikidata <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
