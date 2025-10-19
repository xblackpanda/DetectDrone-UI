import { useMemo, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Mapoffline.css";  


const BASE_COORDINATE = {
  name: "Phra Nakhon Command",
  lat: 13.7563,
  lng: 100.5018,
};

const DEFAULT_RADIUS_KM = 35;

const baseIcon = L.divIcon({
  className: "base-icon-wrapper",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `
    <div class="base-icon">
      <span class="base-icon__pulse"></span>
      <span class="base-icon__dot"></span>
    </div>
  `,
});

const zonePalette = ["#7ea4ff", "#ff905c", "#7de2a8", "#ffc861", "#c98bff"];

function buildTileUrl() {
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalized}tiles/{z}/{x}/{y}.png`;
}

export default function OfflineMap({ alertZones = [], base = BASE_COORDINATE, zoom = 12 }) {
  const zones = Array.isArray(alertZones) ? alertZones : [];
  const baseLat = base?.lat ?? BASE_COORDINATE.lat;
  const baseLng = base?.lng ?? BASE_COORDINATE.lng;
  const baseName = base?.name ?? BASE_COORDINATE.name;

  const [tileErrors, setTileErrors] = useState(0);

  const mapCenter = useMemo(() => {
    if (zones.length > 0) {
      const zone = zones[0];
      return [zone.lat, zone.lng];
    }
    return [baseLat, baseLng];
  }, [zones, baseLat, baseLng]);

  const tileUrl = useMemo(buildTileUrl, []);

  return (
    <div className="map-frame offline-map">
      <MapContainer
        className="leaflet-map"
        center={mapCenter}
        zoom={zoom}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        preferCanvas
      >
        <TileLayer
          url={tileUrl}
          tileSize={256}
          minZoom={0}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTileErrors((count) => count + 1),
          }}
        />
        {zones.map((zone, index) => {
          const color = zonePalette[index % zonePalette.length];
          const radiusMeters = Math.max(zone.radiusKm ?? DEFAULT_RADIUS_KM, 0) * 1000;
          return (
            <Circle
              key={zone.id ?? index}
              center={[zone.lat, zone.lng]}
              radius={radiusMeters}
              pathOptions={{
                color,
                weight: zone.radiusKm <= 0 ? 1 : 2,
                dashArray: "6 10",
                fillOpacity: 0.08,
                fillColor: color,
              }}
            >
              <Tooltip className="tooltip-base" direction="top" offset={[0, -16]}>
                {zone.name ?? `เขตแจ้งเตือน ${index + 1}`} | {Math.round(zone.radiusKm ?? DEFAULT_RADIUS_KM)} กม.
              </Tooltip>
            </Circle>
          );
        })}
        <Marker position={[baseLat, baseLng]} icon={baseIcon}>
          <Tooltip className="tooltip-base" direction="top" offset={[0, -16]}>
            {baseName}
          </Tooltip>
        </Marker>
      </MapContainer>
      {tileErrors > 0 ? (
        <div
          className="offline-map__warning"
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            background: "rgba(12, 24, 42, 0.92)",
            border: "1px solid rgba(255, 95, 95, 0.55)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            color: "#ff9f9f",
            lineHeight: 1.4,
            maxWidth: 260,
            pointerEvents: "none",
          }}
        >
          Offline tiles missing ({tileErrors}). Verify files in public/tiles.
        </div>
      ) : null}
    </div>
  );
}
