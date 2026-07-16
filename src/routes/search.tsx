import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, X, Wifi, Droplet, Car, PawPrint, Sofa, Home as HomeIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { formatKes } from "@/lib/listings";
import { useListings } from "@/hooks/use-listings";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — Keja" }] }),
  component: SearchPage,
});

const beds = ["Any", "Studio", "1", "2", "3+"];
const amenities = [
  { label: "Wi-Fi", icon: Wifi },
  { label: "Water", icon: Droplet },
  { label: "Parking", icon: Car },
  { label: "Pets", icon: PawPrint },
  { label: "Furnished", icon: Sofa },
  { label: "Own compound", icon: HomeIcon },
];

function SearchPage() {
  const [q, setQ] = useState("");
  const [budget, setBudget] = useState(200000);
  const [bed, setBed] = useState("Any");
  const [active, setActive] = useState<string[]>([]);
  const { data: listings = [], isLoading } = useListings();

  const results = listings.filter((l) => {
    if (l.rent > budget) return false;
    if (q && !`${l.title} ${l.neighborhood}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (bed !== "Any") {
      if (bed === "Studio" && l.bedrooms !== 0) return false;
      if (bed === "3+" && l.bedrooms < 3) return false;
      if (["1", "2"].includes(bed) && l.bedrooms !== Number(bed)) return false;
    }
    if (active.length && !active.every((a) => l.amenities.includes(a))) return false;
    return true;
  });

  return (
    <AppShell>
      <header className="glass sticky top-0 z-20 px-5 pb-4 pt-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="press flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft">
            <X className="h-4 w-4" />
          </Link>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Try "bedsitter near town"'
              className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </header>

      <div className="animate-fade-up space-y-6 px-5 pt-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Budget</label>
            <span className="text-sm font-semibold">Up to {formatKes(budget)}</span>
          </div>
          <input
            type="range" min={5000} max={200000} step={1000} value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-[oklch(0.599_0.174_142.1)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bedrooms</label>
          <div className="flex gap-2">
            {beds.map((b) => (
              <button
                key={b} onClick={() => setBed(b)}
                className={`press flex-1 rounded-2xl border py-2.5 text-sm font-medium ${
                  bed === b ? "border-transparent bg-foreground text-background" : "border-border bg-card"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Must have</label>
          <div className="flex flex-wrap gap-2">
            {amenities.map(({ label, icon: Icon }) => {
              const isOn = active.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => setActive((a) => (a.includes(label) ? a.filter((x) => x !== label) : [...a, label]))}
                  className={`press flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-medium transition ${
                    isOn ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {isLoading ? "Loading…" : `${results.length} homes match`}
            </h2>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <div className="space-y-4">
            {results.map((l) => (
              <ListingCard key={l.id} listing={l} variant="wide" />
            ))}
            {!isLoading && results.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No matches yet — try widening your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
