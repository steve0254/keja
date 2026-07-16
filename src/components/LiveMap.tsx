import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatKes, type Listing } from "@/lib/listings";

// This file imports "leaflet", which touches `window` as soon as it's
// evaluated. It must only ever be loaded on the client (see map.tsx, which
// lazy-loads this component after mount) — never imported at the top of a
// route module, or SSR will crash with "window is not defined".

function pinIcon(label: string, active: boolean) {
  const bg = active ? "bg-foreground text-background" : "bg-white text-foreground";
  return L.divIcon({
    className: "",
    html: `
      <div class="press flex flex-col items-center" style="transform: translateY(-4px)">
        <span class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-float ${bg}">
          ${label}
        </span>
        <span class="mx-auto -mt-1 h-2 w-2 rotate-45 shadow-float ${active ? "bg-foreground" : "bg-white"}"></span>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [28, 38],
  });
}

const liveIcon = L.divIcon({
  className: "",
  html: `
    <span class="relative flex h-4 w-4">
      <span class="absolute inline-flex h-full w-full animate-live-dot rounded-full bg-primary/40"></span>
      <span class="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-primary"></span>
    </span>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FlyToUser({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [target, map]);
  return null;
}

export default function LiveMap({
  center,
  listings,
  selected,
  onSelect,
  userLocation,
  flyTarget,
}: {
  center: [number, number];
  listings: Listing[];
  selected: Listing | null;
  onSelect: (l: Listing) => void;
  userLocation: [number, number] | null;
  flyTarget: [number, number] | null;
}) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      zoomControl={false}
      attributionControl={false}
      className="absolute inset-0 h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <FlyToUser target={flyTarget} />

      {userLocation && <Marker position={userLocation} icon={liveIcon} />}

      {listings
        .filter((l) => l.lat && l.lng)
        .map((l) => {
          const active = selected?.id === l.id;
          return (
            <Marker
              key={l.id}
              position={[l.lat, l.lng]}
              icon={pinIcon(formatKes(l.rent), active)}
              eventHandlers={{ click: () => onSelect(l) }}
            />
          );
        })}
    </MapContainer>
  );
}
