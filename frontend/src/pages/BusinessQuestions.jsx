import {
  ChevronRight,
  Code2,
  GitCommit,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mockQuestions } from "../api/mocks";

const cypherQueries = {
  1: `// Q1: PageRank Centrality Graph Data Science (GDS)
CALL gds.pageRank.stream('mouvementGraph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).nom AS nom, score
ORDER BY score DESC LIMIT 10;`,

  2: `// Q2: Shortest Influence Path between two artists
MATCH (source:Artiste {nom: 'Eugène Boudin'}), (target:Artiste {nom: 'Camille Pissarro'})
MATCH path = shortestPath((source)-[:INFLUENCE_PAR*..5]->(target))
RETURN [n IN nodes(path) | n.nom] AS chaine_influence;`,

  3: `// Q3: Geographic concentration of artworks per Region
MATCH (o:Oeuvre)-[:APPARTIENT_AU_MOUVEMENT]->(m:Mouvement {nom: 'Impressionnisme'})
MATCH (o)-[:EXPOSEE_A]->(mus:Musee)-[:SITUE_A]->(:Ville)-[:DANS]->(:Departement)-[:DANS]->(r:Region)
RETURN r.nom AS region, count(o) AS nb
ORDER BY nb DESC;`,

  4: `// Q4: Hub Museums holding the most works for a given movement
MATCH (m:Mouvement {nom: 'Impressionnisme'})<-[:APPARTIENT_AU_MOUVEMENT]-(o:Oeuvre)-[:EXPOSEE_A]->(mus:Musee)
RETURN mus.nom AS musee, count(o) AS nb
ORDER BY nb DESC LIMIT 5;`,

  5: `// Q5: Distribution of an artist's works across museums
MATCH (a:Artiste {nom: 'Claude Monet'})-[:A_CREE]->(o:Oeuvre)-[:EXPOSEE_A]->(mus:Musee)
RETURN mus.nom AS musee, count(o) AS nb
ORDER BY nb DESC;`,
};

export default function BusinessQuestions() {
  const [idActive, setIdActive] = useState(1);
  const [showCode, setShowCode] = useState(true);

  const question = mockQuestions[idActive];
  const cypherCode = cypherQueries[idActive];

  const colors = ["#818cf8", "#c084fc", "#38bdf8", "#f472b6", "#34d399"];

  return (
    <div className="page-container animate-fade-in flex flex-col gap-6">
      {" "}
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
            <div className="badge badge-purple" style={{ marginBottom: 8 }}>
              <HelpCircle size={12} /> Graph Analytics & Business Intelligence
            </div>
            <h1
              className="font-display"
              style={{ fontSize: "2.1rem", margin: 0 }}
            >
              5 Questions Métier{" "}
              <span className="gradient-text">& Requêtes Cypher</span>
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.92rem",
                marginTop: 4,
              }}
            >
              Démonstration des capacités de traversée de graphe et des
              algorithmes Neo4j GDS.
            </p>
          </div>

          <button
            className={`btn ${showCode ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setShowCode(!showCode)}
            style={{ padding: "8px 16px" }}
          >
            <Code2 size={16} />{" "}
            {showCode ? "Masquer le code Cypher" : "Afficher le code Cypher"}
          </button>
        </div>
      </div>
      {/* Tabs bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {Object.keys(mockQuestions).map((id) => {
          const num = Number(id);
          const q = mockQuestions[num];
          const isSelected = num === idActive;

          return (
            <div
              key={id}
              onClick={() => setIdActive(num)}
              className={`glass-card glass-card-hover`}
              style={{
                cursor: "pointer",
                padding: "14px 16px",
                borderColor: isSelected
                  ? "var(--accent-primary)"
                  : "var(--border)",
                background: isSelected
                  ? "rgba(129, 140, 248, 0.15)"
                  : "var(--bg-card)",
                boxShadow: isSelected
                  ? "0 0 14px rgba(129, 140, 248, 0.2)"
                  : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  className={`badge ${
                    isSelected ? "badge-purple" : "badge-cyan"
                  }`}
                  style={{ fontSize: "0.7rem" }}
                >
                  Question Q{id}
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: isSelected ? "#fff" : "var(--text-muted)",
                  lineHeight: 1.35,
                }}
              >
                {q.titre}
              </div>
            </div>
          );
        })}
      </div>
      {/* Question Details Card */}
      <div className="glass-card" style={{ padding: "28px" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span
              className="badge badge-purple"
              style={{ fontSize: "0.78rem" }}
            >
              Question {idActive} / 5
            </span>
            <h2 style={{ fontSize: "1.5rem", margin: 0 }}>{question.titre}</h2>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
            {question.description}
          </p>
        </div>

        {/* Optional Cypher Inspector Box */}
        {showCode && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
                fontSize: "0.85rem",
                color: "var(--accent-cyan)",
                fontWeight: 600,
              }}
            >
              <Code2 size={15} /> Requête Neo4j Cypher exécutée :
            </div>
            <pre className="code-inspector">{cypherCode}</pre>
          </div>
        )}

        {/* Visual Results */}
        {question.type === "bar" && (
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <TrendingUp
                size={18}
                style={{ color: "var(--accent-primary)" }}
              />
              Résultat des agrégations GDS / Cypher
            </h3>
            <div style={{ height: 320, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={question.data}
                  margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                >
                  <XAxis
                    dataKey={question.xKey}
                    stroke="#64748b"
                    fontSize={13}
                    tickLine={false}
                  />
                  <YAxis stroke="#64748b" fontSize={13} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#121522",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: 10,
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                  />
                  <Bar dataKey={question.yKey} radius={[8, 8, 0, 0]}>
                    {question.data.map((entry, index) => (
                      <Cell
                        key={`q-cell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Visual Path Flow for Q2 */}
        {question.type === "path" && (
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <GitCommit size={18} style={{ color: "var(--accent-cyan)" }} />
              Chemin d'influence extrait (shortestPath)
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "28px 20px",
                background: "rgba(10, 12, 20, 0.8)",
                borderRadius: 14,
                border: "1px solid var(--border)",
                overflowX: "auto",
              }}
            >
              {question.data.map((nom, i) => (
                <div
                  key={nom}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      padding: "16px 22px",
                      borderRadius: 14,
                      background:
                        i === 0
                          ? "rgba(129, 140, 248, 0.2)"
                          : i === question.data.length - 1
                          ? "rgba(244, 72, 186, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                      border:
                        i === 0
                          ? "1px solid #818cf8"
                          : i === question.data.length - 1
                          ? "1px solid #f472b6"
                          : "1px solid var(--border)",
                      boxShadow: "var(--shadow-sm)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      className="badge badge-purple"
                      style={{ fontSize: "0.68rem", marginBottom: 6 }}
                    >
                      {i === 0
                        ? "Source"
                        : i === question.data.length - 1
                        ? "Cible"
                        : `Étape ${i}`}
                    </div>
                    <div
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {nom}
                    </div>
                  </div>

                  {i < question.data.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        color: "var(--accent-cyan)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-subtle)",
                          marginBottom: 4,
                          fontWeight: 600,
                        }}
                      >
                        [:INFLUENCE_PAR]
                      </span>
                      <ChevronRight size={28} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
