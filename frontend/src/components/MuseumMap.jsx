import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

// Fix Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MuseumMap({ musees }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    >
      <MapContainer
        center={[46.6, 2.4]}
        zoom={6}
        style={{ height: 600, width: "100%", background: "#0c0e17" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        {musees.map((m) => (
          <Marker key={m.nom} position={[m.lat, m.lon]}>
            <Popup>
              <div style={{ padding: 4 }}>
                <h4
                  style={{
                    color: "#fff",
                    margin: "0 0 6px 0",
                    fontSize: "1rem",
                  }}
                >
                  {m.nom}
                </h4>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "#94a3b8",
                    marginBottom: 8,
                  }}
                >
                  Coordonnées : {m.lat.toFixed(4)}, {m.lon.toFixed(4)}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {m.mouvements.map((mov) => (
                    <span
                      key={mov}
                      style={{
                        background: "rgba(129, 140, 248, 0.2)",
                        color: "#818cf8",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      {mov}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
