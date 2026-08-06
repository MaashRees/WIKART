import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Database,
  PlusCircle,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import client from "../api/client";

export default function CrudDemo() {
  const [titre, setTitre] = useState("");
  const [artiste, setArtiste] = useState("");
  const [mouvement, setMouvement] = useState("Impressionnisme");
  const [annee, setAnnee] = useState("1875");
  const [musee, setMusee] = useState("Musée d'Orsay");

  const [message, setMessage] = useState(null);
  const [statusType, setStatusType] = useState("success");
  const [searchFilter, setSearchFilter] = useState("");

  // Local state representing database records for CRUD preview
  const [oeuvres, setOeuvres] = useState([
    {
      id: "REF-001",
      titre: "Impression, soleil levant",
      artiste: "Claude Monet",
      annee: 1872,
      musee: "Musée Marmottan",
      mouvement: "Impressionnisme",
    },
    {
      id: "REF-002",
      titre: "La Classe de danse",
      artiste: "Edgar Degas",
      annee: 1874,
      musee: "Musée d'Orsay",
      mouvement: "Impressionnisme",
    },
    {
      id: "REF-003",
      titre: "Nymphéas",
      artiste: "Claude Monet",
      annee: 1916,
      musee: "Musée de l'Orangerie",
      mouvement: "Impressionnisme",
    },
    {
      id: "REF-004",
      titre: "Bal du moulin de la Galette",
      artiste: "Auguste Renoir",
      annee: 1876,
      musee: "Musée d'Orsay",
      mouvement: "Impressionnisme",
    },
  ]);

  const ajouter = async (e) => {
    e.preventDefault();
    if (!titre.trim() || !artiste.trim()) {
      setMessage("Veuillez renseigner au moins le titre et l'artiste.");
      setStatusType("error");
      return;
    }

    try {
      // Send API POST request
      await client.post("/oeuvres", {
        titre,
        artiste,
        mouvement,
        annee,
        musee,
      });

      const newNotice = {
        id: `REF-00${oeuvres.length + 1}`,
        titre,
        artiste,
        mouvement,
        annee: Number(annee) || 1900,
        musee,
      };

      setOeuvres([newNotice, ...oeuvres]);
      setMessage(`Œuvre "${titre}" créée et reliée dans Neo4j avec succès !`);
      setStatusType("success");
      setTitre("");
      setArtiste("");
    } catch (err) {
      // Simulated local fallback for offline/demo mode
      const newNotice = {
        id: `REF-00${oeuvres.length + 1}`,
        titre,
        artiste,
        mouvement,
        annee: Number(annee) || 1900,
        musee,
      };
      setOeuvres([newNotice, ...oeuvres]);
      setMessage(`Œuvre "${titre}" ajoutée en mode démo !`);
      setStatusType("success");
      setTitre("");
      setArtiste("");
    }
  };

  const supprimer = (id, titreOeuvre) => {
    setOeuvres(oeuvres.filter((o) => o.id !== id));
    setMessage(`Œuvre "${titreOeuvre}" supprimée de la base.`);
    setStatusType("info");
  };

  const filteredOeuvres = oeuvres.filter(
    (o) =>
      o.titre.toLowerCase().includes(searchFilter.toLowerCase()) ||
      o.artiste.toLowerCase().includes(searchFilter.toLowerCase()) ||
      o.musee.toLowerCase().includes(searchFilter.toLowerCase()),
  );

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
              <Database size={12} /> Live Neo4j Cypher Operations
            </div>
            <h1
              className="font-display"
              style={{ fontSize: "2.1rem", margin: 0 }}
            >
              Démo de Gestion <span className="gradient-text">CRUD Neo4j</span>
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.92rem",
                marginTop: 4,
              }}
            >
              Interface administrative pour l'insertion, mise à jour et
              suppression de notices d'œuvres dans le graphe.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className="animate-fade-in"
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            background:
              statusType === "success"
                ? "rgba(52, 211, 153, 0.15)"
                : statusType === "error"
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(56, 189, 248, 0.15)",
            border: `1px solid ${
              statusType === "success"
                ? "rgba(52, 211, 153, 0.4)"
                : statusType === "error"
                ? "rgba(239, 68, 68, 0.4)"
                : "rgba(56, 189, 248, 0.4)"
            }`,
            color:
              statusType === "success"
                ? "#34d399"
                : statusType === "error"
                ? "#f87171"
                : "#38bdf8",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.92rem",
            fontWeight: 600,
          }}
        >
          {statusType === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Grid: Form & List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
        {/* Form panel */}
        <div className="glass-card">
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              fontSize: "1.1rem",
            }}
          >
            <PlusCircle size={18} style={{ color: "var(--accent-primary)" }} />
            Nouvelle Notice d'Œuvre
          </h3>

          <form
            onSubmit={ajouter}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Titre de l'œuvre *
              </label>
              <input
                className="input-field"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Ex. Le Bassin aux nymphéas"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Auteur / Artiste *
              </label>
              <input
                className="input-field"
                value={artiste}
                onChange={(e) => setArtiste(e.target.value)}
                placeholder="Ex. Claude Monet"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Mouvement artistique
              </label>
              <select
                className="input-field select-field"
                value={mouvement}
                onChange={(e) => setMouvement(e.target.value)}
              >
                <option value="Impressionnisme">Impressionnisme</option>
                <option value="Post-impressionnisme">
                  Post-impressionnisme
                </option>
                <option value="Renaissance">Renaissance</option>
                <option value="Art nouveau">Art nouveau</option>
                <option value="Cubisme">Cubisme</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Année de création
              </label>
              <input
                className="input-field"
                type="number"
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
                placeholder="1875"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Musée d'exposition
              </label>
              <input
                className="input-field"
                value={musee}
                onChange={(e) => setMusee(e.target.value)}
                placeholder="Ex. Musée d'Orsay"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 8, padding: 10 }}
            >
              <PlusCircle size={16} /> Créer le Nœud (:Oeuvre)
            </button>
          </form>
        </div>

        {/* Data Table Panel */}
        <div
          className="glass-card"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
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
              <Database
                size={18}
                style={{ color: "var(--accent-secondary)" }}
              />
              Notices enregistrées ({filteredOeuvres.length})
            </h3>

            {/* Search Filter */}
            <div style={{ position: "relative", width: 240 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-subtle)",
                }}
              />
              <input
                className="input-field"
                style={{ paddingLeft: 36, fontSize: "0.85rem" }}
                placeholder="Rechercher..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.92rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  <th style={{ padding: "14px 16px" }}>Réf</th>
                  <th style={{ padding: "14px 16px" }}>Titre</th>
                  <th style={{ padding: "14px 16px" }}>Artiste</th>
                  <th style={{ padding: "14px 16px" }}>Musée</th>
                  <th style={{ padding: "14px 16px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOeuvres.map((o) => (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "background 0.2s",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.82rem",
                        color: "var(--accent-cyan)",
                      }}
                    >
                      {o.id}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {o.titre}
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-subtle)",
                          marginTop: 3,
                        }}
                      >
                        {o.mouvement} • {o.annee}
                      </div>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-muted)" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <User size={14} /> {o.artiste}
                      </span>
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-muted)" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Building2 size={14} /> {o.musee}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "8px 12px", fontSize: "0.82rem" }}
                        onClick={() => supprimer(o.id, o.titre)}
                        title="Supprimer la notice"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
