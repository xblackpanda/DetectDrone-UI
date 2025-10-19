import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 };

const formatKm = (value) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const radiusPresets = [15, 25, 35, 50, 75, 100];
const zonePalette = ["#7ea4ff", "#ff905c", "#7de2a8", "#ffc861", "#c98bff"];

const notificationDefaults = {
  realtime: true,
  sound: true,
  escalation: false,
  autoDismiss: false,
};

const notificationOptions = [
  {
    key: "realtime",
    label: "แจ้งเตือนทันที",
    description:
      "แจ้งเตือนโดรนเข้าสู่โซนที่อันตราย",
  },
  {
    key: "sound",
    label: "เสียงสัญญาณเตือน",
    description:
      "เล่นเสียงแจ้งเตือนเมื่อมีโดรนเข้าสู่โซนที่อันตราย",
  },
  {
    key: "escalation",
    label: "ส่งต่อเวรผลัด",
    description:
      "ยกระดับการแจ้งเตือนไปยังเวรผลัดถัดไป",
  },
  {
    key: "autoDismiss",
    label: "เครียร์การแจ้งเตือนอัตโนมัติ",
    description:
      "ปิดการแจ้งเตือนเมื่อโดรนออกจากโซนที่อันตราย",
  },
];

const copy = {
  panelTitle: "\u0e01\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e23\u0e30\u0e1a\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19",
  zonesTitle: "\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e19",
  zonesDescription:
    "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e27\u0e07\u0e40\u0e08\u0e49\u0e32\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e2b\u0e25\u0e32\u0e22\u0e08\u0e38\u0e14 \u0e04\u0e25\u0e34\u0e01\u0e1a\u0e19\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e27\u0e32\u0e07\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e28\u0e39\u0e19\u0e22\u0e4c",
  addZone: "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e27\u0e07\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19",
  noZone: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e27\u0e07\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e19",
  nameLabel: "\u0e0a\u0e37\u0e48\u0e2d\u0e27\u0e07\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e19",
  latLabel: "\u0e25\u0e30\u0e15\u0e34\u0e08\u0e39\u0e14",
  lngLabel: "\u0e25\u0e2d\u0e07\u0e08\u0e34\u0e15\u0e14\u0e4c",
  radiusLabel: "\u0e23\u0e30\u0e22\u0e30\u0e23\u0e31\u0e28\u0e21\u0e35 (5-120 \u0e01\u0e21.)",
  primaryBadge: "\u0e2b\u0e25\u0e31\u0e01",
  setPrimary: "\u0e15\u0e31\u0e49\u0e07\u0e40\u0e1b\u0e47\u0e19\u0e27\u0e07\u0e2b\u0e25\u0e31\u0e01",
  removeZone: "\u0e25\u0e1a\u0e27\u0e07\u0e19\u0e35\u0e49",
  mapHint: "\u0e04\u0e25\u0e34\u0e01\u0e2b\u0e23\u0e37\u0e2d\u0e25\u0e32\u0e01\u0e2b\u0e21\u0e38\u0e14\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07",
  togglesTitle: "\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19",
  togglesDescription:
    "\u0e40\u0e1b\u0e34\u0e14\u0e1b\u0e34\u0e14\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21\u0e15\u0e32\u0e21\u0e04\u0e27\u0e32\u0e21\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e02\u0e2d\u0e07\u0e28\u0e39\u0e19\u0e22\u0e4c\u0e1a\u0e31\u0e0d\u0e0a\u0e32\u0e01\u0e32\u0e23",
  autoSaveNote:
    "\u0e01\u0e32\u0e23\u0e1b\u0e23\u0e31\u0e1a\u0e04\u0e48\u0e32\u0e27\u0e07\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e19\u0e08\u0e30\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e1a\u0e19\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e41\u0e25\u0e30\u0e23\u0e32\u0e22\u0e07\u0e32\u0e19\u0e17\u0e31\u0e19\u0e17\u0e35",
};

const createZoneMarker = (color) =>
  L.divIcon({
    className: "zone-center-marker",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;border:2px solid ${color};background:rgba(4,9,18,0.92);box-shadow:0 0 14px ${color}66;"></span>`,
  });

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      if (onSelect) {
        onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
      }
    },
  });
  return null;
}

function ZonePlacementMap({ zones, activeZoneId, onPositionChange }) {
  const activeZone = useMemo(() => {
    if (!Array.isArray(zones) || zones.length === 0) {
      return null;
    }
    return zones.find((zone) => zone.id === activeZoneId) ?? zones[0];
  }, [zones, activeZoneId]);

  const mapCenter = useMemo(() => {
    if (activeZone) {
      return [activeZone.lat, activeZone.lng];
    }
    if (zones.length > 0) {
      return [zones[0].lat, zones[0].lng];
    }
    return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
  }, [activeZone, zones]);

  const activeColor = useMemo(() => {
    if (!activeZone) {
      return zonePalette[0];
    }
    const idx = zones.findIndex((zone) => zone.id === activeZone.id);
    return zonePalette[(idx >= 0 ? idx : 0) % zonePalette.length];
  }, [activeZone, zones]);

  const handleSelect = (coords) => {
    if (onPositionChange && coords) {
      onPositionChange(coords);
    }
  };

  return (
    <MapContainer
      className="settings-zone-map"
      center={mapCenter}
      zoom={11}
      minZoom={6}
      maxZoom={16}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {zones.map((zone, index) => {
        const color = zonePalette[index % zonePalette.length];
        const radiusMeters = Math.max(zone.radiusKm ?? 0, 0) * 1000;
        const isActive = zone.id === activeZoneId;
        return (
          <Circle
            key={zone.id ?? index}
            center={[zone.lat, zone.lng]}
            radius={radiusMeters}
            pathOptions={{
              color,
              weight: isActive ? 3 : 2,
              dashArray: isActive ? "4 6" : "6 10",
              fillOpacity: isActive ? 0.14 : 0.06,
              fillColor: color,
            }}
          >
            <Tooltip className="tooltip-base" direction="top" offset={[0, -16]}>
              {zone.name ?? `\u0e40\u0e02\u0e15\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19 ${index + 1}`}
            </Tooltip>
          </Circle>
        );
      })}
      {activeZone ? (
        <Marker
          position={[activeZone.lat, activeZone.lng]}
          draggable
          icon={createZoneMarker(activeColor)}
          eventHandlers={{
            dragend: (event) => {
              const { lat, lng } = event.target.getLatLng();
              handleSelect({ lat, lng });
            },
          }}
        >
          <Tooltip className="tooltip-base" direction="top" offset={[0, -16]}>
            {copy.mapHint}
          </Tooltip>
        </Marker>
      ) : null}
      {activeZone ? <MapClickHandler onSelect={handleSelect} /> : null}
    </MapContainer>
  );
}

export default function Settings({
  alertZones = [],
  primaryZoneId,
  onAddZone,
  onUpdateZone,
  onRemoveZone,
  onSelectPrimaryZone,
}) {
  const zones = Array.isArray(alertZones) ? alertZones : [];
  const [selectedZoneId, setSelectedZoneId] = useState(
    zones[0]?.id ?? null
  );
  const previousIdsRef = useRef(zones.map((zone) => zone.id));
  const [coordinateDraft, setCoordinateDraft] = useState({ lat: "", lng: "" });
  const [notificationSettings, setNotificationSettings] = useState(
    notificationDefaults
  );

  useEffect(() => {
    const previousIds = previousIdsRef.current;
    const currentIds = zones.map((zone) => zone.id);

    if (currentIds.length > previousIds.length) {
      const newlyAdded = zones.find((zone) => !previousIds.includes(zone.id));
      if (newlyAdded) {
        setSelectedZoneId(newlyAdded.id);
      }
    }

    if (zones.length === 0) {
      setSelectedZoneId(null);
    } else if (!zones.some((zone) => zone.id === selectedZoneId)) {
      setSelectedZoneId(zones[0].id);
    }

    previousIdsRef.current = currentIds;
  }, [zones, selectedZoneId]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  useEffect(() => {
    if (selectedZone) {
      setCoordinateDraft({
        lat: selectedZone.lat.toFixed(6),
        lng: selectedZone.lng.toFixed(6),
      });
    } else {
      setCoordinateDraft({ lat: "", lng: "" });
    }
  }, [selectedZone]);

  const selectedIndex = useMemo(
    () => zones.findIndex((zone) => zone.id === selectedZoneId),
    [zones, selectedZoneId]
  );

  const formattedRadius = useMemo(() => {
    if (!selectedZone) {
      return `-- \u0e01\u0e21.`;
    }
    return `${formatKm(selectedZone.radiusKm ?? 0)} \u0e01\u0e21.`;
  }, [selectedZone?.radiusKm]);

  const clampRadius = (value) => {
    const numericValue = Number.isFinite(value) ? value : selectedZone?.radiusKm ?? 0;
    return Math.min(Math.max(Math.round(numericValue), 5), 120);
  };

  const updateZone = (patch) => {
    if (!selectedZone || !onUpdateZone) {
      return;
    }
    onUpdateZone(selectedZone.id, patch);
  };

  const handleRadiusChange = (value) => {
    const nextValue = clampRadius(value);
    updateZone({ radiusKm: nextValue });
  };

  const handlePresetClick = (preset) => {
    handleRadiusChange(preset);
  };

  const handleCoordinateInputChange = (key, value) => {
    setCoordinateDraft((prev) => ({ ...prev, [key]: value }));
  };

  const commitCoordinate = (key, rawValue) => {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) {
      updateZone({ [key]: parsed });
    } else if (selectedZone) {
      setCoordinateDraft((prev) => ({
        ...prev,
        [key]:
          key === "lat"
            ? selectedZone.lat.toFixed(6)
            : selectedZone.lng.toFixed(6),
      }));
    }
  };

  const handlePositionChange = ({ lat, lng }) => {
    updateZone({ lat, lng });
  };

  const toggleNotification = (key) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="settings-panel">
      <header className="settings-panel__header">
        <div>
          <p className="settings-panel__tag">ALERT CONFIG</p>
          <h2 className="settings-panel__title">{copy.panelTitle}</h2>
        </div>
        <span className="settings-panel__radius-value">{formattedRadius}</span>
      </header>

      <section className="settings-section">
        <h3 className="settings-section__title">{copy.zonesTitle}</h3>
        <p className="settings-section__description">
          {copy.zonesDescription}
        </p>
        <div className="settings-zones">
          <div className="settings-zone-list-wrapper">
            <button
              type="button"
              className="settings-add-zone"
              onClick={() => onAddZone && onAddZone()}
            >
              + {copy.addZone}
            </button>
            <div className="settings-zone-list">
              {zones.length === 0 ? (
                <span className="settings-zone-list__empty">{copy.noZone}</span>
              ) : (
                zones.map((zone, index) => {
                  const color = zonePalette[index % zonePalette.length];
                  const isActive = zone.id === selectedZoneId;
                  const isPrimary = zone.id === primaryZoneId;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      className={`settings-zone-list__item${
                        isActive ? " settings-zone-list__item--active" : ""
                      }`}
                      onClick={() => setSelectedZoneId(zone.id)}
                    >
                      <span
                        className="settings-zone-list__swatch"
                        style={{ backgroundColor: color }}
                      />
                      <span className="settings-zone-list__label">
                        <span className="settings-zone-list__name">
                          {zone.name ?? `\u0e40\u0e02\u0e15\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19 ${index + 1}`}
                        </span>
                        <span className="settings-zone-list__meta">
                          {formatKm(zone.radiusKm ?? 0)} รัศมี หน่วย กม.
                        </span>
                      </span>
                      {isPrimary ? (
                        <span className="settings-zone-list__badge">
                          {copy.primaryBadge}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="settings-zone-editor">
            {selectedZone ? (
              <>
                <div className="settings-control">
                  <label className="settings-control__label" htmlFor="zone-name">
                    {copy.nameLabel}
                  </label>
                  <input
                    id="zone-name"
                    type="text"
                    value={selectedZone.name ?? ""}
                    onChange={(event) =>
                      updateZone({ name: event.target.value })
                    }
                    className="settings-control__text"
                    placeholder="\u0e15\u0e31\u0e49\u0e07\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e08\u0e33\u0e07\u0e48\u0e32\u0e22\u0e01\u0e32\u0e23"
                  />
                </div>

                <div className="settings-control settings-control--inline">
                  <div className="settings-control__group">
                    <label className="settings-control__label" htmlFor="zone-lat">
                      {copy.latLabel}
                    </label>
                    <input
                      id="zone-lat"
                      type="text"
                      value={coordinateDraft.lat}
                      onChange={(event) =>
                        handleCoordinateInputChange("lat", event.target.value)
                      }
                      onBlur={(event) =>
                        commitCoordinate("lat", event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitCoordinate("lat", event.currentTarget.value);
                        }
                      }}
                      className="settings-control__text"
                    />
                  </div>
                  <div className="settings-control__group">
                    <label className="settings-control__label" htmlFor="zone-lng">
                      {copy.lngLabel}
                    </label>
                    <input
                      id="zone-lng"
                      type="text"
                      value={coordinateDraft.lng}
                      onChange={(event) =>
                        handleCoordinateInputChange("lng", event.target.value)
                      }
                      onBlur={(event) =>
                        commitCoordinate("lng", event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitCoordinate("lng", event.currentTarget.value);
                        }
                      }}
                      className="settings-control__text"
                    />
                  </div>
                </div>

                <div className="settings-control">
                  <label className="settings-control__label" htmlFor="alert-radius">
                    {copy.radiusLabel}
                  </label>
                  <input
                    id="alert-radius"
                    type="range"
                    min="5"
                    max="120"
                    step="1"
                    value={selectedZone.radiusKm ?? 5}
                    onChange={(event) =>
                      handleRadiusChange(Number(event.target.value))
                    }
                    className="settings-control__slider"
                  />
                  <div className="settings-control__input-row">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={selectedZone.radiusKm ?? 5}
                      onChange={(event) =>
                        handleRadiusChange(Number(event.target.value))
                      }
                      className="settings-control__number"
                    />
                    <span className="settings-control__unit">กม.</span>
                  </div>
                  <div className="settings-control__presets">
                    {radiusPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className={`settings-preset${
                          preset === Math.round(selectedZone.radiusKm ?? 0)
                            ? " settings-preset--active"
                            : ""
                        }`}
                      >
                        {preset} กิโลเมตร
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-zone-map-wrapper">
                  <ZonePlacementMap
                    zones={zones}
                    activeZoneId={selectedZoneId}
                    onPositionChange={handlePositionChange}
                  />
                  <p className="settings-zone-map__note">{copy.mapHint}</p>
                </div>

                <div className="settings-zone-actions">
                  <button
                    type="button"
                    className="settings-secondary-action"
                    onClick={() =>
                      onSelectPrimaryZone && onSelectPrimaryZone(selectedZone.id)
                    }
                    disabled={selectedZone.id === primaryZoneId}
                  >
                    {copy.setPrimary}
                  </button>
                  <button
                    type="button"
                    className="settings-danger-action"
                    onClick={() => onRemoveZone && onRemoveZone(selectedZone.id)}
                    disabled={zones.length <= 1}
                  >
                    {copy.removeZone}
                  </button>
                </div>
              </>
            ) : (
              <div className="settings-zone-empty">{copy.noZone}</div>
            )}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">{copy.togglesTitle}</h3>
        <p className="settings-section__description">
          {copy.togglesDescription}
        </p>
        <div className="settings-toggle-group">
          {notificationOptions.map(({ key, label, description }) => (
            <button
              key={key}
              type="button"
              className={`settings-toggle${
                notificationSettings[key] ? " settings-toggle--active" : ""
              }`}
              onClick={() => toggleNotification(key)}
              aria-pressed={notificationSettings[key]}
            >
              <span className="settings-toggle__label">{label}</span>
              <span className="settings-toggle__description">
                {description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="settings-panel__footer">
        <p className="settings-panel__note">{copy.autoSaveNote}</p>
      </footer>
    </div>
  );
}
