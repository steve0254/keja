import { ListingCard } from "@/components/ListingCard";
import type { Listing } from "@/lib/listings";

export function ListingResultsStrip({ ids, listings }: { ids: string[]; listings: Listing[] }) {
  const matched = ids
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is Listing => Boolean(l));
  if (matched.length === 0) return null;

  return (
    <div className="flex w-full gap-3 overflow-x-auto pb-1 pl-10">
      {matched.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
