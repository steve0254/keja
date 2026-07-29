import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatKes, type Listing } from "@/lib/listings";

// This file imports "leaflet", which touches `window` as soon as it's
// evaluated. It must only ever be loaded on the client (see map.tsx, which
// lazy-loads this component after mount) — never imported at the top of a
// route module, or SSR will crash with "window is not defined".

export type TileStyle = "standard" | "light";

const TILE_STYLES: Record<TileStyle, { url: string; attribution: string; maxZoom: number }> = {
  // Single-host OpenStreetMap endpoint — the old {s} subdomain-sharded URL
  // (a/b/c.tile.openstreetmap.org) is deprecated and increasingly
  // unreliable, which is a real contributor to a map "feeling heavy".
  standard: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  // CartoDB's free "Positron" tiles — lighter visual weight, useful as a
  // real second option for the map's Layers toggle.
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
};

// Icons are cheap to build but not free — memoizing per (label, active) pair
// means selecting one marker doesn't regenerate every other marker's icon on
// every render, which is the main thing that made the map feel sluggish
// with more than a handful of listings on screen.
const iconCache = new Map<string, L.DivIcon>();
function pinIcon(label: string, active: boolean) {
  const key = `${label}|${active}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const bg = active ? "bg-foreground text-background" : "bg-white text-foreground";
  const icon = L.divIcon({
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
  iconCache.set(key, icon);
  return icon;
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

// Only render markers currently within the viewport (plus a margin so
// panning doesn't pop pins in/out right at the edge). Cheap, dependency-free
// alternative to a full clustering library — plenty for this scale, and the
// approach that actually scales if the listing count grows a lot later.
function useVisibleBounds() {
  const map = useMap();
  const [bounds, setBounds] = useState(() => map.getBounds().pad(0.3));

  useMapEvents({
    moveend: () => setBounds(map.getBounds().pad(0.3)),
    zoomend: () => setBounds(map.getBounds().pad(0.3)),
  });

  return bounds;
}

function MarkerLayer({
  listings,
  selected,
  onSelect,
}: {
  listings: Listing[];
  selected: Listing | null;
  onSelect: (l: Listing) => void;
}) {
  const bounds = useVisibleBounds();
  const withCoords = useMemo(() => listings.filter((l) => l.lat && l.lng), [listings]);
  const visible = useMemo(
    () => withCoords.filter((l) => bounds.contains([l.lat, l.lng])),
    [withCoords, bounds],
  );

  return (
    <>
      {visible.map((l) => {
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
    </>
  );
}

export default function LiveMap({
  center,
  listings,
  selected,
  onSelect,
  userLocation,
  flyTarget,
  tileStyle = "standard",
}: {
  center: [number, number];
  listings: Listing[];
  selected: Listing | null;
  onSelect: (l: Listing) => void;
  userLocation: [number, number] | null;
  flyTarget: [number, number] | null;
  tileStyle?: TileStyle;
}) {
  const tiles = TILE_STYLES[tileStyle];
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      zoomControl={false}
      attributionControl
      preferCanvas
      className="absolute inset-0 h-full w-full"
    >
      <TileLayer
        key={tileStyle}
        url={tiles.url}
        attribution={tiles.attribution}
        maxZoom={tiles.maxZoom}
      />

      <FlyToUser target={flyTarget} />

      {userLocation && <Marker position={userLocation} icon={liveIcon} />}

      <MarkerLayer listings={listings} selected={selected} onSelect={onSelect} />
    </MapContainer>
  );
}
