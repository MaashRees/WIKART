import { useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

export default function NetworkGraph({ artiste }) {
  const fgRef = useRef();

  // Create graph nodes & links based on artist data
  const centralNode = { 
    id: artiste.artiste.nom, 
    group: "central", 
    label: artiste.artiste.nom,
    val: 20 
  };

  const influenceNodes = artiste.influences.map((i) => ({
    id: i.nom,
    group: "influence",
    label: i.nom,
    val: 12
  }));

  const artworkNodes = artiste.oeuvres.map((o) => ({
    id: o.titre,
    group: "oeuvre",
    label: `${o.titre} (${o.annee})`,
    val: 8
  }));

  const nodes = [centralNode, ...influenceNodes, ...artworkNodes];

  const links = [
    ...artiste.influences.map((i) => ({
      source: i.nom,
      target: artiste.artiste.nom,
      label: "INFLUENCE_PAR"
    })),
    ...artiste.oeuvres.map((o) => ({
      source: artiste.artiste.nom,
      target: o.titre,
      label: "A_CREE"
    }))
  ];

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-220);
    }
  }, []);

  const getNodeColor = (node) => {
    switch (node.group) {
      case "central": return "#c084fc";
      case "influence": return "#38bdf8";
      case "oeuvre": return "#f472b6";
      default: return "#818cf8";
    }
  };

  return (
    <div 
      className="glass-card" 
      style={{ 
        position: "relative", 
        padding: 0, 
        overflow: "hidden",
        border: "1px solid var(--border)",
        height: 520 
      }}
    >
      {/* Top Legend Header */}
      <div 
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pointerEvents: "none"
        }}
      >
        <div 
          style={{ 
            display: "flex", 
            gap: 12, 
            background: "rgba(10, 12, 20, 0.85)", 
            backdropFilter: "blur(12px)",
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            pointerEvents: "auto"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#c084fc", boxShadow: "0 0 8px #c084fc" }} />
            <span style={{ color: "#fff", fontWeight: 600 }}>Artiste Sélectionné</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8" }} />
            <span style={{ color: "var(--text-muted)" }}>Influence (Wikidata)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f472b6" }} />
            <span style={{ color: "var(--text-muted)" }}>Œuvres (Joconde)</span>
          </div>
        </div>

        <div 
          style={{ 
            display: "flex", 
            gap: 6, 
            background: "rgba(10, 12, 20, 0.85)", 
            backdropFilter: "blur(12px)",
            padding: "4px 8px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            pointerEvents: "auto"
          }}
        >
          <button 
            className="btn btn-secondary" 
            style={{ padding: 6 }} 
            onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.25, 400)}
            title="Zoom Avant"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: 6 }} 
            onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.25, 400)}
            title="Zoom Arrière"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: 6 }} 
            onClick={() => fgRef.current?.zoomToFit(400, 40)}
            title="Réinitialiser la vue"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Force Graph Canvas */}
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        nodeLabel={(node) => node.label}
        nodeColor={getNodeColor}
        nodeRelSize={7}
        linkColor={() => "rgba(148, 163, 184, 0.35)"}
        linkWidth={2}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          const radius = node.group === "central" ? 14 : node.group === "influence" ? 10 : 7;

          // Glowing Outer Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.group === "central" ? "rgba(192, 132, 252, 0.4)" : "rgba(56, 189, 248, 0.2)";
          ctx.fill();

          // Main Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = getNodeColor(node);
          ctx.fill();

          // Border
          ctx.lineWidth = 1.5 / globalScale;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          // Text Label below
          if (globalScale > 0.8 || node.group === "central") {
            ctx.font = `${node.group === "central" ? "bold " : ""}${fontSize}px 'Plus Jakarta Sans', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.group === "central" ? "#ffffff" : "#cbd5e1";
            ctx.fillText(label, node.x, node.y + radius + fontSize + 2);
          }
        }}
        backgroundColor="#090b14"
      />
    </div>
  );
}
