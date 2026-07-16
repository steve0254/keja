import { Link } from "@tanstack/react-router";
import { Heart, MapPin, BadgeCheck } from "lucide-react";
import { formatKes, statusMeta, type Listing } from "@/lib/listings";

export function ListingCard({ listing, variant = "default" }: { listing: Listing; variant?: "default" | "wide" }) {
  const meta = statusMeta[listing.status];
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className={`rise group block overflow-hidden rounded-3xl bg-card shadow-soft ${
        variant === "wide" ? "" : "w-[260px] shrink-0"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={listing.image}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${meta.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName} ${listing.status === "available" ? "animate-live-dot" : ""}`} />
            {meta.label}
          </span>
        </div>
        <button
          type="button"
          aria-label="Save"
          onClick={(e) => { e.preventDefault(); }}
          className="press absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur"
        >
          <Heart className="h-4 w-4 text-foreground" />
        </button>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-foreground">{listing.title}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {listing.neighborhood}
            </p>
          </div>
          {listing.verified && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              <BadgeCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {formatKes(listing.rent)}
            <span className="text-xs font-medium text-muted-foreground"> /mo</span>
          </p>
          <span className="text-[11px] text-muted-foreground">{listing.listedAgo}</span>
        </div>
      </div>
    </Link>
  );
}
