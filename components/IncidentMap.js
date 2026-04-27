import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet.heat";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { incidentTypes } from "../store/incidentSlice";

const KIFISOS_CENTER = [38.0042, 23.7052];
const markerIcon = L.divIcon({
  className: "incident-marker",
  html: "!",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return undefined;

    const heat = L.heatLayer(points, {
      radius: 32,
      blur: 24,
      maxZoom: 15,
      gradient: {
        0.25: "#22c55e",
        0.55: "#f5c542",
        0.85: "#f97316",
        1: "#e5484d",
      },
    }).addTo(map);

    return () => heat.remove();
  }, [map, points]);

  return null;
}

function PickLocation({ onPick }) {
  useMapEvents({
    click(event) {
      if (onPick) {
        onPick({
          latitude: Number(event.latlng.lat.toFixed(6)),
          longitude: Number(event.latlng.lng.toFixed(6)),
        });
      }
    },
  });
  return null;
}

export default function IncidentMap({ incidents, selectedLocation, onPick, mode = "full" }) {
  const filteredIncidents = useMemo(
    () => incidents.filter((incident) => incident.latitude && incident.longitude),
    [incidents]
  );

  const heatPoints = filteredIncidents.map((incident) => [
    incident.latitude,
    incident.longitude,
    incident.severity === "high" ? 0.95 : incident.severity === "medium" ? 0.65 : 0.4,
  ]);

  return (
    <MapContainer
      center={selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : KIFISOS_CENTER}
      zoom={12}
      scrollWheelZoom
      className={onPick ? "map-picker" : ""}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mode !== "points" ? <HeatmapLayer points={heatPoints} /> : null}
      {filteredIncidents.map((incident) => {
        const type = incidentTypes.find((item) => item.value === incident.type);
        return (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-bold text-asphalt">{incident.title}</p>
                <p className="text-sm text-slate-600">{type?.label || incident.type}</p>
                <p className="text-sm text-slate-600">{incident.duration_minutes} λεπτά</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {selectedLocation ? (
        <Marker
          position={[selectedLocation.latitude, selectedLocation.longitude]}
          icon={markerIcon}
        />
      ) : null}
      <PickLocation onPick={onPick} />
    </MapContainer>
  );
}
