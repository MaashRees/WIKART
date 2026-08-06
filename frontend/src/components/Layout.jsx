import {
  Database,
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Network,
  Share2,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }) {
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/explorateur", label: "Réseau d'artistes", icon: Share2 },
    { path: "/carte", label: "Carte des musées", icon: MapPin },
    { path: "/questions", label: "Questions métier", icon: HelpCircle },
    { path: "/crud", label: "Gestion CRUD", icon: Database },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Header / Navbar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(9, 10, 15, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo & Branding */}
          <NavLink
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 0 14px rgba(168, 85, 247, 0.35)",
              }}
            >
              <Network size={20} />
            </div>
            <div>
              <div
                className="font-display"
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "0.05em",
                  lineHeight: 1,
                }}
              >
                WIK<span style={{ color: "var(--accent-secondary)" }}>ART</span>
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Graph Analytics & Patrimoine
              </div>
            </div>
          </NavLink>

          {/* Navigation Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    background: isActive
                      ? "rgba(129, 140, 248, 0.15)"
                      : "transparent",
                    color: isActive ? "#ffffff" : "var(--text-muted)",
                    border: isActive
                      ? "1px solid rgba(129, 140, 248, 0.3)"
                      : "1px solid transparent",
                  })}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Connection Status Badge */}
          <div
            className="badge badge-emerald"
            style={{
              padding: "5px 10px",
              fontSize: "0.72rem",
              background: "rgba(52, 211, 153, 0.1)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent-emerald)",
                boxShadow: "0 0 6px var(--accent-emerald)",
                display: "inline-block",
              }}
            />
            Neo4j AuraDB Connected
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main style={{ flex: 1 }} className="p-6">
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(8, 9, 14, 0.95)",
          padding: "20px 0",
          marginTop: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            fontSize: "0.82rem",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={15} style={{ color: "var(--accent-secondary)" }} />
            <span>
              Projet Pro NoSQL & Big Data — Musées, Artistes et Œuvres
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a
              href="https://culture.data.gouv.fr/datasets/5b448216a3a729752eb11d6f"
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Base Joconde <ExternalLink size={12} />
            </a>
            <a
              href="https://query.wikidata.org/"
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--text-muted)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Wikidata SPARQL <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
