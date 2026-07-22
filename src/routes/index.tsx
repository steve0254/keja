import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Sparkles, Bell, SlidersHorizontal, MapPin, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { ListingCardSkeleton } from "@/components/LoadingScreen";
import { chipTypes, trendingHoods } from "@/lib/listings";
import { useListings } from "@/hooks/use-listings";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Keja — Find a home, live" },
      { name: "description", content: "Real-time rental availability. Discover vacant homes in your city and book viewings in minutes." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: listings = [], isLoading } = useListings();
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const trending = listings.slice(0, 3);

  return (
    <AppShell>
      <header className="animate-fade px-5 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Good morning</p>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">
              Where do you want<br />to live, {firstName}?
            </h1>
          </div>
          {user ? (
            <button aria-label="Notifications" className="press glass relative flex h-11 w-11 items-center justify-center rounded-2xl">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
            </button>
          ) : (
            <Link to="/auth" className="press rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-pop">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="animate-fade-up mt-6 px-5">
        <Link to="/search" className="press flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Search className="h-5 w-5" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-sm font-medium text-foreground">Search vacant homes</span>
            <span className="block text-xs text-muted-foreground">Budget · bedrooms · move-in date</span>
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
        </Link>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {chipTypes.map((c, i) => (
            <button
              key={c}
              className={`press whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition ${
                i === 0 ? "border-transparent bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="animate-fade-up mt-6 px-5">
        <Link
          to="/map"
          className="press flex items-center gap-3 rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.40_0.15_142.1)] p-4 text-primary-foreground shadow-pop"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <MapPin className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest opacity-90">
              <span className="h-1.5 w-1.5 animate-live-dot rounded-full bg-white" /> Live now
            </span>
            <span className="mt-0.5 block text-sm font-medium">{listings.length} homes vacant near you</span>
          </span>
          <ChevronRight className="h-5 w-5 opacity-80" />
        </Link>
      </section>

      <section className="animate-fade-up mt-8">
        <div className="mb-3 flex items-end justify-between px-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Just listed</h2>
            <p className="text-xs text-muted-foreground">Fresh vacancies in the last 24 hours</p>
          </div>
          <Link to="/search" className="text-xs font-medium text-primary">See all</Link>
        </div>
        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <ListingCardSkeleton />
            <ListingCardSkeleton />
            <ListingCardSkeleton />
          </div>
        ) : listings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      <section className="animate-fade-up mt-8 px-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Trending neighborhoods</h2>
            <p className="text-xs text-muted-foreground">Where people are moving this week</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {trendingHoods.map((n) => (
            <button key={n.name} className="press rise rounded-2xl bg-card p-4 text-left shadow-soft">
              <p className="text-sm font-semibold">{n.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.count} vacant</p>
            </button>
          ))}
        </div>
      </section>

      {trending.length > 0 && (
        <section className="animate-fade-up mt-8 px-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recommended for you</h2>
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> AI matched
            </span>
          </div>
          <div className="space-y-4">
            {trending.map((l) => (
              <ListingCard key={l.id} listing={l} variant="wide" />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="mx-5 rounded-3xl border border-dashed border-border bg-card p-6 text-center">
      <p className="text-sm font-semibold">No vacancies yet</p>
      <p className="mt-1 text-xs text-muted-foreground">Be the first — landlords can publish a home in under a minute.</p>
      <Link to="/add" className="press mt-4 inline-flex rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">
        Add a vacancy
      </Link>
    </div>
  );
}
