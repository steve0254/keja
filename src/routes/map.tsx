import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Locate, Layers, Navigation as NavIcon, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { statusMeta, formatKes, type Listing } from "@/lib/listings";
import { useListings } from "@/hooks/use-listings";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Live map — Keja" }] }),
  component: MapPage,
});

// Nairobi, Kenya — default map center for listings without a saved location.
const NAIROBI_CENTER: [number, number] = [-1.2921, 36.8219];

// LiveMap imports "leaflet", which touches `window` on load and crashes SSR,
// so it's lazy-loaded and only rendered once we know we're in the browser.
const LiveMap = lazy(() => import("@/components/LiveMap"));

function MapPage() {
  const { data: listings = [] } = useListings();
  const [selected, setSelected] = useState<Listing | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!selected && listings[0]) setSelected(listings[0]);
  }, [listings, selected]);

  useEffect(() => {
    if (!mounted || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setUserLocation(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [mounted]);

  const center = useMemo<[number, number]>(() => {
    const withCoords = listings.filter((l) => l.lat && l.lng);
    if (withCoords.length === 0) return userLocation ?? NAIROBI_CENTER;
    const first = withCoords[0];
    return [first.lat, first.lng];
  }, [listings, userLocation]);

  const handleLocate = () => {
    if (userLocation) {
      setFlyTarget(userLocation);
      return;
    }
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setFlyTarget(loc);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <AppShell>
      <div className="relative h-[100svh]">
        <div className="absolute inset-0 bg-muted">
          {mounted && (
            <Suspense fallback={null}>
              <LiveMap
                center={center}
                listings={listings}
                selected={selected}
                onSelect={setSelected}
                userLocation={userLocation}
                flyTarget={flyTarget}
              />
            </Suspense>
          )}
        </div>

        <div className="glass pointer-events-auto absolute left-4 right-4 top-6 z-[500] flex items-center justify-between rounded-2xl px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Live map</p>
            <p className="text-sm font-semibold">{listings.length} vacant nearby</p>
          </div>
          <div className="flex gap-2">
            <button aria-label="Layers" className="press flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow-soft">
              <Layers className="h-4 w-4" />
            </button>
            <button
              aria-label="Locate me"
              onClick={handleLocate}
              className="press flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft"
            >
              <Locate className="h-4 w-4" />
            </button>
          </div>
        </div>

        {selected && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[500] px-3">
            <div className="animate-fade-up pointer-events-auto mx-auto max-w-[420px] rounded-3xl bg-card p-4 shadow-pop">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
              <div className="flex gap-3">
                <img src={selected.image} alt={selected.title} className="h-24 w-24 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold">{selected.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta[selected.status].className}`}>
                      {statusMeta[selected.status].label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{selected.neighborhood}</p>
                  <p className="mt-1 text-base font-semibold tracking-tight">
                    {formatKes(selected.rent)}<span className="text-xs font-medium text-muted-foreground"> /mo</span>
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Link
                      to="/listing/$id" params={{ id: selected.id }}
                      className="press flex-1 rounded-xl bg-primary py-2 text-center text-xs font-semibold text-primary-foreground"
                    >
                      View
                    </Link>
                    <button className="press flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                      <NavIcon className="h-4 w-4" />
                    </button>
                    <button className="press flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
