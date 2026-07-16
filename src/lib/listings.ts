import p1 from "@/assets/property-1.jpg";
import p2 from "@/assets/property-2.jpg";
import p3 from "@/assets/property-3.jpg";
import p4 from "@/assets/property-4.jpg";

export type Status = "available" | "viewing" | "reserved" | "occupied";

export type Listing = {
  id: string;
  title: string;
  neighborhood: string;
  type: string;
  rent: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  distanceKm: number;
  walkMin: number;
  listedAgo: string;
  status: Status;
  verified: boolean;
  image: string;
  gallery: string[];
  amenities: string[];
  caretaker: { name: string; initials: string; rating: number };
  lat: number;
  lng: number;
  owner_id?: string;
  description?: string | null;
  address?: string | null;
};

const fallbackImages = [p1, p2, p3, p4];

function initials(name: string | null | undefined) {
  if (!name) return "NA";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "NA";
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export type DbListing = {
  id: string;
  owner_id: string;
  title: string;
  neighborhood: string;
  type: string;
  rent: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  description: string | null;
  amenities: string[] | null;
  images: string[] | null;
  status: Status;
  verified: boolean;
  lat: number | null;
  lng: number | null;
  address: string | null;
  caretaker_name: string | null;
  caretaker_phone: string | null;
  created_at: string;
};

export function adaptListing(row: DbListing, idx = 0): Listing {
  const gallery = row.images && row.images.length > 0 ? row.images : [fallbackImages[idx % fallbackImages.length]];
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    neighborhood: row.neighborhood,
    type: row.type,
    rent: row.rent,
    deposit: row.deposit,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    description: row.description,
    address: row.address,
    distanceKm: 0,
    walkMin: 0,
    listedAgo: timeAgo(row.created_at),
    status: row.status,
    verified: row.verified,
    image: gallery[0],
    gallery,
    amenities: row.amenities ?? [],
    caretaker: {
      name: row.caretaker_name ?? "Caretaker",
      initials: initials(row.caretaker_name),
      rating: 4.8,
    },
    // Fallback to Nairobi-area coordinates (spread in a small grid) when a
    // listing has no saved location, so it still lands in the right city.
    lat: row.lat ?? -1.2921 + (idx % 4) * 0.012 - 0.018,
    lng: row.lng ?? 36.8219 + (idx % 3) * 0.014 - 0.014,
  };
}

export const chipTypes = ["All", "Single Room", "Double Room", "Bedsitter", "Studio", "1 Bed", "2 Bed", "Maisonette", "Shop", "Own compound"];
export const trendingHoods = [
  { name: "Kilimani", count: 128 },
  { name: "Riverside", count: 74 },
  { name: "Lavington", count: 56 },
  { name: "Westlands", count: 92 },
  { name: "Ngong Road", count: 41 },
];

export const statusMeta: Record<Status, { label: string; className: string; dotClassName: string }> = {
  available: { label: "Available", className: "bg-available/10 text-available", dotClassName: "bg-available" },
  viewing:   { label: "Viewing",   className: "bg-viewing/15 text-viewing",     dotClassName: "bg-viewing" },
  reserved:  { label: "Reserved",  className: "bg-reserved/10 text-reserved",   dotClassName: "bg-reserved" },
  occupied:  { label: "Occupied",  className: "bg-muted text-muted-foreground", dotClassName: "bg-occupied" },
};

export function formatKes(n: number) {
  return `KSh ${n.toLocaleString()}`;
}
