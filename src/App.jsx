import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import SideNav from "./components/NavBarlift.jsx";
import OperationalMap from "./components/Map.jsx";
import IntelPanel from "./components/Table.jsx";
import FlightRoutes from "./components/Route.jsx";
import Settings from "./components/settings.jsx";
import { connectWebSocket, disconnect } from "./upda/client.js";


const MAP_BOUNDS = {
  lat: [13.45, 13.95],
  lng: [100.2, 100.85],
};

const BASE_COORDINATE = {
  name: "Phra Nakhon Command",
  lat: 13.7563,
  lng: 100.5018,
};

const DEFAULT_ALERT_RADIUS_KM = 35;

const generateZoneId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `zone-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createZone = (overrides = {}) => ({
  id: generateZoneId(),
  name: overrides.name ?? "เขตแจ้งเตือน",
  lat: overrides.lat ?? BASE_COORDINATE.lat,
  lng: overrides.lng ?? BASE_COORDINATE.lng,
  radiusKm: overrides.radiusKm ?? DEFAULT_ALERT_RADIUS_KM,
});

const INITIAL_ZONE = createZone({
  name: BASE_COORDINATE.name,
  lat: BASE_COORDINATE.lat,
  lng: BASE_COORDINATE.lng,
});

const statusPalette = {
  hostile: "#ff5f5f",
  friendly: "#28d17c",
  neutral: "#ffc861",
  unknown: "#8aa0b7",
};

const STATUS_LABELS = {
  friendly: "\u0e1d\u0e48\u0e32\u0e22\u0e1c\u0e31\u0e19\u0e21\u0e34\u0e15\u0e23",
  hostile: "\u0e1d\u0e48\u0e32\u0e22\u0e28\u0e31\u0e15\u0e23\u0e39",
  neutral: "\u0e40\u0e1b\u0e47\u0e19\u0e01\u0e25\u0e32\u0e07",
  unknown: "\u0e44\u0e21\u0e48\u0e17\u0e23\u0e32\u0e1a",
};

const STATIONARY_TIMEOUT_MS = 10000;

const relativeTimeFormatter = new Intl.RelativeTimeFormat("th-TH", { numeric: "auto" });

const formatRelativeTime = (targetDate, referenceDate = new Date()) => {
  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
    return "-";
  }
  const reference = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
    ? referenceDate
    : new Date();
  const diffSeconds = Math.round((targetDate.getTime() - reference.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return relativeTimeFormatter.format(diffSeconds, "second");
  }
  if (absSeconds < 3600) {
    return relativeTimeFormatter.format(Math.round(diffSeconds / 60), "minute");
  }
  if (absSeconds < 86400) {
    return relativeTimeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  }
  return relativeTimeFormatter.format(Math.round(diffSeconds / 86400), "day");
};

const convertSpeedMpsToKmh = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.round(numeric * 36) / 10;
};

const extractMessagesFromEvent = (raw) => {
  if (typeof raw !== "string") {
    return [];
  }
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const payloads = [];

  lines.forEach((line) => {
    const sanitized =
      line.startsWith("<") || line.startsWith(">")
        ? line.slice(1).trim()
        : line;

    if (!sanitized) {
      return;
    }

    try {
      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (entry && typeof entry === "object") {
            payloads.push(entry);
          }
        });
      } else if (parsed && typeof parsed === "object") {
        payloads.push(parsed);
      }
    } catch {
      // ignore unparsable line
    }
  });

  return payloads;
};

const normalizeDronePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.type && payload.type !== "drone") {
    return null;
  }

  const id = payload.drone_id ?? payload.id;
  if (!id) {
    return null;
  }

  const lat = Number(payload.latitude ?? payload.lat);
  const lng = Number(payload.longitude ?? payload.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const altitude = Number(payload.altitude_m ?? payload.altitude);
  const speedKmh = convertSpeedMpsToKmh(payload.speed_mps ?? payload.speed);
  const timestampValue = payload.timestamp ? new Date(payload.timestamp) : new Date();
  const lastSeenAt = Number.isNaN(timestampValue.getTime()) ? new Date() : timestampValue;

  return {
    id,
    codename: payload.drone_id ?? payload.codename ?? id,
    lat,
    lng,
    altitude: Number.isFinite(altitude) ? altitude : 0,
    speed: Number.isFinite(speedKmh) ? speedKmh : 0,
    allegiance: "unknown",
    lastSeenAt,
    confidence: typeof payload.confidence === "number" ? payload.confidence : undefined,
  };
};

const toDateOrNull = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value === "string") {
    const fromString = new Date(value);
    return Number.isNaN(fromString.getTime()) ? null : fromString;
  }
  return null;
};

const filterStationaryDrones = (drones, now = Date.now()) => {
  if (!Array.isArray(drones) || drones.length === 0) {
    return Array.isArray(drones) ? drones : [];
  }
  const cutoff = now - STATIONARY_TIMEOUT_MS;
  const filtered = drones.filter((drone) => {
    const lastMoveDate = toDateOrNull(drone?.lastMoveAt);
    const lastMoveTime = lastMoveDate ? lastMoveDate.getTime() : 0;
    return lastMoveTime >= cutoff;
  });
  return filtered.length === drones.length ? drones : filtered;
};

const degToRad = (value) => (value * Math.PI) / 180;

const calculateDistanceKm = (pointA, pointB) => {
  const earthRadiusKm = 6371;
  const dLat = degToRad(pointB.lat - pointA.lat);
  const dLng = degToRad(pointB.lng - pointA.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(pointA.lat)) *
      Math.cos(degToRad(pointB.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 10) / 10;
};

function HomeDashboard({
  drones,
  dronesInCriticalZone,
  statusCounts,
  timestamp,
  alertZones,
  primaryZone,
}) {
  return (
    <>
      <section className="map-section">
        <OperationalMap
          drones={drones}
          bounds={MAP_BOUNDS}
          base={BASE_COORDINATE}
          alertZones={alertZones}
          primaryZoneId={primaryZone?.id}
          statusLabels={STATUS_LABELS}
          statusCounts={statusCounts}
        />
      </section>
      <aside className="intel-section">
        <IntelPanel
          drones={dronesInCriticalZone}
          radiusKm={primaryZone?.radiusKm ?? DEFAULT_ALERT_RADIUS_KM}
          timestamp={timestamp}
        />
      </aside>
    </>
  );
}

function SettingsPanel({
  alertZones,
  primaryZoneId,
  onAddZone,
  onUpdateZone,
  onRemoveZone,
  onSelectPrimaryZone,
}) {
  return (
    <Settings
      alertZones={alertZones}
      primaryZoneId={primaryZoneId}
      onAddZone={onAddZone}
      onUpdateZone={onUpdateZone}
      onRemoveZone={onRemoveZone}
      onSelectPrimaryZone={onSelectPrimaryZone}
    />
  );
}

function App() {
  const location = useLocation();
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [alertZones, setAlertZones] = useState(() => [INITIAL_ZONE]);
  const [primaryZoneId, setPrimaryZoneId] = useState(() => INITIAL_ZONE.id);
  const [rawDrones, setRawDrones] = useState(() => []);

  useEffect(() => {
    const ticker = setInterval(() => setTimestamp(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    connectWebSocket({
      autoReconnect: true,
      onMessage: (event) => {
        const payloads = extractMessagesFromEvent(event.data);
        if (payloads.length === 0) {
          return;
        }

        setRawDrones((previous) => {
          const registry = new Map(
            (previous ?? []).map((drone) => [drone.id, drone])
          );
          const now = Date.now();

          payloads.forEach((payload) => {
            const normalized = normalizeDronePayload(payload);
            if (!normalized) {
              return;
            }

            const existing = registry.get(normalized.id);
            const lastSeenAt = toDateOrNull(normalized.lastSeenAt) ?? new Date();
            const previousLat = existing?.lat;
            const previousLng = existing?.lng;
            const positionChanged =
              !Number.isFinite(previousLat) ||
              !Number.isFinite(previousLng) ||
              previousLat !== normalized.lat ||
              previousLng !== normalized.lng;
            const previousMoveDate = toDateOrNull(existing?.lastMoveAt);
            const lastMoveAt = positionChanged ? lastSeenAt : previousMoveDate ?? lastSeenAt;

            registry.set(normalized.id, {
              ...existing,
              ...normalized,
              lastSeenAt,
              lastMoveAt,
              codename: existing?.codename ?? normalized.codename,
              allegiance:
                existing?.allegiance ?? normalized.allegiance ?? "unknown",
            });
          });

          return filterStationaryDrones(Array.from(registry.values()), now);
        });
      },
    });

    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    const cleaner = setInterval(() => {
      setRawDrones((previous) => filterStationaryDrones(previous, Date.now()));
    }, 1000);
    return () => clearInterval(cleaner);
  }, []);

  const drones = useMemo(
    () =>
      (rawDrones ?? [])
        .filter(
          (drone) => Number.isFinite(drone?.lat) && Number.isFinite(drone?.lng)
        )
        .map((drone) => {
          const distanceKm = calculateDistanceKm(BASE_COORDINATE, drone);
          const statusColor =
            statusPalette[drone.allegiance] ?? statusPalette.unknown;
          return {
            ...drone,
            distanceKm,
            statusColor,
            speed: Number.isFinite(drone.speed) ? drone.speed : 0,
            lastSeen: formatRelativeTime(drone.lastSeenAt, timestamp),
          };
        }),
    [rawDrones, timestamp]
  );

  const primaryZone = useMemo(() => {
    if (alertZones.length === 0) {
      return null;
    }
    return (
      alertZones.find((zone) => zone.id === primaryZoneId) ?? alertZones[0]
    );
  }, [alertZones, primaryZoneId]);

  const statusCounts = useMemo(() => {
    if (!primaryZone) {
      return {};
    }
    const counts = {};
    drones.forEach((drone) => {
      const distanceToZone = calculateDistanceKm(primaryZone, drone);
      if (distanceToZone <= primaryZone.radiusKm) {
        counts[drone.allegiance] = (counts[drone.allegiance] ?? 0) + 1;
      }
    });
    return counts;
  }, [drones, primaryZone]);

  const statusLegend = useMemo(() => {
    const seen = new Set();
    const legend = [];

    drones.forEach((drone) => {
      if (seen.has(drone.allegiance)) {
        return;
      }
      seen.add(drone.allegiance);
      legend.push({
        status: drone.allegiance,
        color: drone.statusColor,
        label: STATUS_LABELS[drone.allegiance] ?? drone.allegiance,
        count: statusCounts[drone.allegiance] ?? 0,
      });
    });

    return legend;
  }, [drones, statusCounts]);

  const dronesInCriticalZone = useMemo(
    () => {
      if (!primaryZone) {
        return [];
      }
      return drones.filter(
        (drone) =>
          calculateDistanceKm(primaryZone, drone) <= primaryZone.radiusKm
      );
    },
    [drones, primaryZone]
  );

  const activeTab = useMemo(() => {
    if (location.pathname.startsWith("/routes")) {
      return "routes";
    }
    if (location.pathname.startsWith("/settings")) {
      return "settings";
    }
    return "home";
  }, [location.pathname]);

  const handleAddZone = () => {
    setAlertZones((zones) => {
      const template =
        zones.find((zone) => zone.id === primaryZoneId) ?? zones[0];
      const newZone = createZone({
        name: `จุดแจ้งเตือน ${zones.length + 1}`,
        lat: template?.lat ?? BASE_COORDINATE.lat,
        lng: template?.lng ?? BASE_COORDINATE.lng,
        radiusKm: template?.radiusKm ?? DEFAULT_ALERT_RADIUS_KM,
      });
      return [...zones, newZone];
    });
  };

  const handleUpdateZone = (zoneId, updates) => {
    setAlertZones((zones) =>
      zones.map((zone) =>
        zone.id === zoneId ? { ...zone, ...updates } : zone
      )
    );
  };

  const handleRemoveZone = (zoneId) => {
    setAlertZones((zones) => {
      if (zones.length === 1) {
        return zones;
      }
      const nextZones = zones.filter((zone) => zone.id !== zoneId);
      if (primaryZoneId === zoneId) {
        setPrimaryZoneId(nextZones[0]?.id ?? null);
      }
      return nextZones;
    });
  };

  const handleSelectPrimaryZone = (zoneId) => {
    setPrimaryZoneId(zoneId);
  };

  return (
    <div className="app-shell">
      <SideNav activeTab={activeTab} statusLegend={statusLegend} />
      <div className="operational-area">
        <Routes>
          <Route
            path="/"
            element={
              <HomeDashboard
                drones={drones}
                dronesInCriticalZone={dronesInCriticalZone}
                statusCounts={statusCounts}
                timestamp={timestamp}
                alertZones={alertZones}
                primaryZone={primaryZone}
              />
            }
          />
          <Route
            path="/routes"
            element={
              <section className="map-section">
                <FlightRoutes alertZones={alertZones} />
              </section>
            }
          />
          <Route
            path="/settings"
            element={
              <section className="map-section">
                <SettingsPanel
                  alertZones={alertZones}
                  primaryZoneId={primaryZone?.id ?? null}
                  onAddZone={handleAddZone}
                  onUpdateZone={handleUpdateZone}
                  onRemoveZone={handleRemoveZone}
                  onSelectPrimaryZone={handleSelectPrimaryZone}
                />
              </section>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
