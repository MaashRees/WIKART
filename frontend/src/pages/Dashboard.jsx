import {
  ArrowRight,
  Award,
  Building2,
  Frame,
  HelpCircle,
  MapPin,
  Palette,
  Share2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mockDashboard } from "../api/mocks";

export default function Dashboard() {
  const { nbOeuvres, nbArtistes, nbMusees, parMouvement } = mockDashboard;

  const barColors = [
    "#818cf8",
    "#c084fc",
    "#f472b6",
    "#38bdf8",
    "#34d399",
    "#fbbf24",
  ];

  const pieData = parMouvement.map((item, idx) => ({
    name: item.mouvement,
    value: item.nb,
    color: barColors[idx % barColors.length],
  }));

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      {/* Hero Section */}
      <div className="glass-card" style={{ padding: "28px 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 720 }}>
            <div className="badge badge-purple" style={{ marginBottom: 10 }}>
              <Sparkles size={12} /> Base Joconde & Wikidata Neo4j Graph
            </div>
            <h1
              className="font-display"
              style={{ fontSize: "2.2rem", marginBottom: 10, lineHeight: 1.2 }}
            >
              Réseaux d'Influence &{" "}
              <span className="gradient-text">Diffusion Territoriale</span>
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "1rem",
                lineHeight: 1.55,
              }}
            >
              Exploration graphe NoSQL des collections des musées de France et
              des généalogies artistiques. Analysez les centralités d'influence,
              le maillage des musées hubs et les chaînes de transmission.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link
              to="/explorateur"
              className="btn btn-primary"
              style={{ padding: "10px 18px" }}
            >
              <Share2 size={16} /> Explorer le graphe
            </Link>
            <Link
              to="/questions"
              className="btn btn-secondary"
              style={{ padding: "10px 18px" }}
            >
              <HelpCircle size={16} /> Analyses Cypher
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card glass-card-hover stat-card justify-between items-center flex flex-col gap-2">
          <div
            className="stat-icon flex items-center justify-center gap-2"
            style={{
              background: "rgba(129, 140, 248, 0.15)",
              color: "#818cf8",
            }}
          >
            <Frame size={24} />
            <div className="stat-label font-bold">Œuvres référencées</div>
          </div>
          <div>
            <div className="stat-value text-2xl font-bold">
              {nbOeuvres.toLocaleString("fr-FR")}
            </div>
          </div>
        </div>

        <div className="glass-card glass-card-hover stat-card justify-between items-center flex flex-col gap-2">
          <div
            className="stat-icon flex items-center justify-center gap-2"
            style={{
              background: "rgba(192, 132, 252, 0.15)",
              color: "#c084fc",
            }}
          >
            <Palette size={24} />
            <div className="stat-label">Artistes répertoriés</div>
          </div>
          <div>
            <div className="stat-value text-2xl font-bold">
              {nbArtistes.toLocaleString("fr-FR")}
            </div>
          </div>
        </div>

        <div className="glass-card glass-card-hover stat-card justify-between items-center flex flex-col gap-2">
          <div
            className="stat-icon flex items-center justify-center gap-2"
            style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}
          >
            <Building2 size={24} />
            <div className="stat-label">Musées de France</div>
          </div>
          <div>
            <div className="stat-value text-2xl font-bold">
              {nbMusees.toLocaleString("fr-FR")}
            </div>
          </div>
        </div>

        <div className="glass-card glass-card-hover stat-card justify-between items-center flex flex-col gap-2">
          <div
            className="stat-icon flex items-center justify-center gap-2"
            style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" }}
          >
            <Award size={24} />
            <div className="stat-label">Mouvements & Écoles</div>
          </div>
          <div>
            <div className="stat-value text-2xl font-bold">18</div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 20,
        }}
      >
        {/* Bar Chart */}
        <div className="glass-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "1.1rem",
                }}
              >
                <TrendingUp
                  size={18}
                  style={{ color: "var(--accent-primary)" }}
                />
                Volume d'œuvres par mouvement
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Répartition des notices par époque et mouvement artistique
                principal
              </p>
            </div>
            <span className="badge badge-purple">Neo4j Aggregation</span>
          </div>

          <div style={{ height: 260, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={parMouvement}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="mouvement"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 10,
                    color: "#fff",
                  }}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="nb" radius={[6, 6, 0, 0]}>
                  {parMouvement.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="glass-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "1.1rem",
                }}
              >
                <Sparkles
                  size={18}
                  style={{ color: "var(--accent-secondary)" }}
                />
                Part relative des collections
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Poids des courants artistiques représentés dans la base
              </p>
            </div>
            <span className="badge badge-cyan">Ratio</span>
          </div>

          <div
            style={{
              height: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`pie-cell-${index}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121522",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 10,
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minWidth: 150,
              }}
            >
              {pieData.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.85rem",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: item.color,
                    }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>
                    {item.name}:
                  </span>
                  <span style={{ fontWeight: 700, color: "#fff" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Explorer Cards */}
      <div>
        <h2 style={{ fontSize: "1.3rem", marginBottom: 16 }}>
          Modules d'Exploration
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          <Link to="/explorateur" style={{ textDecoration: "none" }}>
            <div
              className="glass-card glass-card-hover"
              style={{ height: "100%" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(168, 85, 247, 0.15)",
                    color: "#c084fc",
                  }}
                >
                  <Share2 size={22} />
                </div>
                <ArrowRight size={18} style={{ color: "var(--text-subtle)" }} />
              </div>
              <h3
                style={{ marginBottom: 8, color: "#fff", fontSize: "1.1rem" }}
              >
                Réseau d'Influence des Artistes
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Visualisez le graphe interactif 2D des maîtres et leurs
                continuateurs rattachés via Wikidata (P737).
              </p>
            </div>
          </Link>

          <Link to="/carte" style={{ textDecoration: "none" }}>
            <div
              className="glass-card glass-card-hover"
              style={{ height: "100%" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                  }}
                >
                  <MapPin size={22} />
                </div>
                <ArrowRight size={18} style={{ color: "var(--text-subtle)" }} />
              </div>
              <h3
                style={{ marginBottom: 8, color: "#fff", fontSize: "1.1rem" }}
              >
                Carte Géographique des Musées
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Cartographiez les musées détenteurs avec filtres dynamiques par
                mouvement artistique et région.
              </p>
            </div>
          </Link>

          <Link to="/questions" style={{ textDecoration: "none" }}>
            <div
              className="glass-card glass-card-hover"
              style={{ height: "100%" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(52, 211, 153, 0.15)",
                    color: "#34d399",
                  }}
                >
                  <HelpCircle size={22} />
                </div>
                <ArrowRight size={18} style={{ color: "var(--text-subtle)" }} />
              </div>
              <h3
                style={{ marginBottom: 8, color: "#fff", fontSize: "1.1rem" }}
              >
                5 Questions Métier & Cypher
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Découvrez la centralité PageRank, les musées hubs et les
                requêtes Neo4j Cypher associées.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
