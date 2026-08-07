import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

const GROUP_COLORS = {
  central: "#c084fc",
  influence: "#38bdf8",
  oeuvre: "#f472b6",
  musee: "#f472b6",
  step: "#38bdf8",
  cible: "#f472b6",
};

export default function NetworkGraph({ nodes, links, legend = [] }) {
  const fgRef = useRef();

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge").strength(-220);
    }
  }, [nodes, links]);

  const getNodeColor = (node) => GROUP_COLORS[node.group] || "#818cf8";

  return (
    <div
      className="glass-card"
      style={{
        position: "relative",
        padding: 0,
        overflow: "hidden",
        border: "1px solid var(--border)",
        height: 520,
      }}
    >
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
          pointerEvents: "none",
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
            pointerEvents: "auto",
          }}
        >
          {legend.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8rem",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: item.strong ? `0 0 8px ${item.color}` : "none",
                }}
              />
              <span
                style={{
                  color: item.strong ? "#fff" : "var(--text-muted)",
                  fontWeight: item.strong ? 600 : 400,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
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
            pointerEvents: "auto",
          }}
        >
          <button
            className="btn btn-secondary"
            style={{ padding: 6 }}
            onClick={() =>
              fgRef.current?.zoom(fgRef.current.zoom() * 1.25, 400)
            }
            title="Zoom Avant"
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: 6 }}
            onClick={() =>
              fgRef.current?.zoom(fgRef.current.zoom() / 1.25, 400)
            }
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
          const radius = node.group === "central" ? 14 : 10;

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI, false);
          ctx.fillStyle =
            node.group === "central"
              ? "rgba(192, 132, 252, 0.4)"
              : "rgba(56, 189, 248, 0.2)";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = getNodeColor(node);
          ctx.fill();

          ctx.lineWidth = 1.5 / globalScale;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          if (globalScale > 0.8 || node.group === "central") {
            ctx.font = `${
              node.group === "central" ? "bold " : ""
            }${fontSize}px 'Plus Jakarta Sans', sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = node.group === "central" ? "#ffffff" : "#cbd5e1";
            ctx.fillText(label, node.x, node.y + radius + fontSize + 2);
          }
        }}
        backgroundColor="#090b14"
      />
    </div>
  );
}
