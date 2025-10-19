import { useEffect, useMemo } from "react";
import {Circle,MapContainer,Marker,TileLayer,Tooltip,useMap} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createDroneIcon = (color) =>
  L.divIcon({
    className: "drone-icon-wrapper",
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -18],
    html: `
      <div class="drone-icon-shell">
        <svg viewBox="0 0 64 64" class="drone-icon" aria-hidden="true">
          <g fill="${color}" fill-opacity="0.88">
            <path d="M28 6h8l2 12H26l2-12z" />
            <path d="M8 28l12-2v12L8 36V28z" />
            <path d="M56 28v8l-12 2V26l12 2z" />
            <path d="M28 46h8l2 12H26l2-12z" />
            <circle cx="32" cy="32" r="10" fill="${color}" fill-opacity="0.65" />
          </g>
          <circle cx="32" cy="32" r="15" stroke="${color}" stroke-width="2" fill="none" stroke-opacity="0.8" />
        </svg>
      </div>
    `,
  });

const baseIcon = L.divIcon({
  className: "base-icon-wrapper",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: 
    <div class="base-icon">
      <span class="base-icon__pulse"></span>
      <span class="base-icon__dot"></span>
    </div>
  ,
});

const zonePalette = ["#7ea4ff", "#ff905c", "#7de2a8", "#ffc861", "#c98bff"];

function FitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, bounds]);

  return null;
}

export default function OperationalMap({
  drones,
  bounds,
  base,
  alertZones = [],
  primaryZoneId,
  statusLabels = {},
  statusCounts = {},
}) {
  const hasDrones = Array.isArray(drones) && drones.length > 0;
  const zones = Array.isArray(alertZones) ? alertZones : [];
  const showMap = hasDrones || zones.length > 0;

  const mapBounds = useMemo(() => {
    if (!bounds) {
      return null;
    }
    return [
      [bounds.lat[0], bounds.lng[0]],
      [bounds.lat[1], bounds.lng[1]],
    ];
  }, [bounds]);

  const droneIcons = useMemo(
    () =>
      (drones ?? []).map((drone) => ({
        id: drone.id,
        icon: createDroneIcon(drone.statusColor),
      })),
    [drones]
  );

  const iconById = useMemo(() => {
    const registry = new Map();
    droneIcons.forEach(({ id, icon }) => registry.set(id, icon));
    return registry;
  }, [droneIcons]);

  const primaryZone = useMemo(() => {
    if (zones.length === 0) {
      return null;
    }
    return zones.find((zone) => zone.id === primaryZoneId) ?? zones[0];
  }, [zones, primaryZoneId]);

  const mapCenter = useMemo(() => {
    const target = primaryZone ?? base;
    return [target.lat, target.lng];
  }, [primaryZone, base]);

  const formatStatusLabel = (status) => {
    const label = statusLabels?.[status] ?? status;
    const count = statusCounts?.[status] ?? 0;
    return `${label} (${count})`;
  };

  return (
    <div className="map-frame">
      {!showMap ? (
        <div className="map-frame empty">???????????????</div>
      ) : (
        <MapContainer
            className="leaflet-map"
            bounds={mapBounds ?? undefined}
            center={mapCenter}
            zoom={11}
            zoomControl={false}
            scrollWheelZoom
          >
            {mapBounds ? <FitBounds bounds={mapBounds} /> : null}

            <TileLayer
              attribution="https://www.openstreetmap.org/copyright\>OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {zones.map((zone, index) => {
              const color = zonePalette[index % zonePalette.length];
              const radiusMeters = Math.max(zone.radiusKm ?? 0, 0) * 1000;
              const isPrimary = zone.id === primaryZoneId;
              return (
                <Circle
                  key={zone.id}
                  center={[zone.lat, zone.lng]}
                  radius={radiusMeters}
                  pathOptions={{
                    color,
                    weight: isPrimary ? 3 : 2,
                    dashArray: isPrimary ? "4 8" : "6 10",
                    fillOpacity: isPrimary ? 0.12 : 0.06,
                    fillColor: color,
                  }}
                >
                  <Tooltip className="tooltip-base" direction="top" offset={[0, -16]}>
                    {zone.name ?? "Alert Zone"} | {Math.round(zone.radiusKm ?? 0)} กม.
                  </Tooltip>
                </Circle>
              );
            })}

            <Marker position={[base.lat, base.lng]} icon={baseIcon}>
              <Tooltip className="tooltip-base" direction="top" offset={[0, -16]}>
                 {base.name}
              </Tooltip>
            </Marker>

            {drones.map((drone) => (
              <Marker
                key={drone.id}
                position={[drone.lat, drone.lng]}
                icon={iconById.get(drone.id)}
              >
                <Tooltip className="tooltip-drone" direction="top" offset={[0, -28]} opacity={0.94} sticky>
                  <div className="drone-tooltip">
                    <span className="drone-tooltip__id">{drone.id}</span>
                    <span className="drone-tooltip__meta">{drone.codename}</span>
                    <span className="drone-tooltip__meta">
                      {formatStatusLabel(drone.allegiance)} | {drone.speed} ??./??.
                    </span>
                    <span className="drone-tooltip__meta">
                      LAT {drone.lat.toFixed(3)} | LNG {drone.lng.toFixed(3)}
                    </span>
                  </div>
                </Tooltip>
              </Marker>
            ))}
        </MapContainer>
      )}
    </div>
  );
}






