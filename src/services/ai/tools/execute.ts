import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MAX_RESULTS = 6;

// Rough centroids for common Nairobi areas, used only for a straight-line
// commute estimate. This is intentionally approximate — real turn-by-turn
// routing lands with the navigation feature (directions API integration);
// until then the assistant is instructed to caveat this as an estimate.
const NEIGHBORHOOD_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  cbd: { lat: -1.2864, lng: 36.8172 },
  "nairobi cbd": { lat: -1.2864, lng: 36.8172 },
  westlands: { lat: -1.2657, lng: 36.8039 },
  kilimani: { lat: -1.2905, lng: 36.7873 },
  kileleshwa: { lat: -1.2801, lng: 36.7822 },
  lavington: { lat: -1.2769, lng: 36.7688 },
  karen: { lat: -1.3193, lng: 36.7076 },
  langata: { lat: -1.3517, lng: 36.7517 },
  "ngong road": { lat: -1.3011, lng: 36.7727 },
  parklands: { lat: -1.2611, lng: 36.8135 },
  riverside: { lat: -1.2739, lng: 36.8058 },
  "south b": { lat: -1.3125, lng: 36.8318 },
  "south c": { lat: -1.3211, lng: 36.8189 },
  eastleigh: { lat: -1.2757, lng: 36.8492 },
  embakasi: { lat: -1.3229, lng: 36.8944 },
  ruaka: { lat: -1.2064, lng: 36.7822 },
  kasarani: { lat: -1.2231, lng: 36.8969 },
  roysambu: { lat: -1.2192, lng: 36.8896 },
  donholm: { lat: -1.2933, lng: 36.8817 },
  buruburu: { lat: -1.2836, lng: 36.8683 },
  "thika road": { lat: -1.2333, lng: 36.8833 },
  rongai: { lat: -1.3959, lng: 36.7539 },
  syokimau: { lat: -1.3722, lng: 36.9339 },
  "ngong town": { lat: -1.3529, lng: 36.6558 },
};

function findCentroid(name: string) {
  const key = name.trim().toLowerCase();
  if (NEIGHBORHOOD_CENTROIDS[key]) return NEIGHBORHOOD_CENTROIDS[key];
  const partial = Object.entries(NEIGHBORHOOD_CENTROIDS).find(
    ([k]) => k.includes(key) || key.includes(k),
  );
  return partial?.[1] ?? null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const LISTING_FIELDS =
  "id, title, neighborhood, type, rent, deposit, bedrooms, bathrooms, amenities, verified, description, status";

export interface ToolExecutionResult {
  result: unknown;
  /** Listing ids surfaced to the UI (rendered as cards under the reply). */
  listingIds?: string[];
}

export async function executeTool(
  name: string,
  rawArgs: Record<string, unknown>,
  supabaseAdmin: SupabaseClient<Database>,
): Promise<ToolExecutionResult> {
  switch (name) {
    case "search_listings": {
      const args = rawArgs as {
        neighborhood?: string;
        type?: string;
        min_bedrooms?: number;
        max_rent?: number;
        min_rent?: number;
        amenities?: string[];
        verified_only?: boolean;
        keyword?: string;
      };

      let query = supabaseAdmin
        .from("listings")
        .select(LISTING_FIELDS)
        .in("status", ["available", "viewing"])
        .order("created_at", { ascending: false })
        .limit(40);

      if (args.neighborhood) query = query.ilike("neighborhood", `%${args.neighborhood}%`);
      if (typeof args.max_rent === "number") query = query.lte("rent", args.max_rent);
      if (typeof args.min_rent === "number") query = query.gte("rent", args.min_rent);
      if (typeof args.min_bedrooms === "number") query = query.gte("bedrooms", args.min_bedrooms);
      if (args.verified_only) query = query.eq("verified", true);
      if (args.amenities && args.amenities.length > 0)
        query = query.contains("amenities", args.amenities);

      const { data, error } = await query;
      if (error) return { result: { error: "Couldn't search listings right now." } };

      let rows = data ?? [];
      // Soft-filter type/keyword in JS: enum + free-text matching is more
      // reliable done here than trusting ILIKE against an enum column.
      if (args.type) {
        const wanted = args.type.toLowerCase();
        rows = rows.filter(
          (r) => r.type.toLowerCase().includes(wanted) || wanted.includes(r.type.toLowerCase()),
        );
      }
      if (args.keyword) {
        const wanted = args.keyword.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.title.toLowerCase().includes(wanted) ||
            (r.description ?? "").toLowerCase().includes(wanted),
        );
      }

      const matches = rows.slice(0, MAX_RESULTS);
      return {
        result: matches.map(({ description, ...rest }) => rest),
        listingIds: matches.map((r) => r.id),
      };
    }

    case "get_listing": {
      const { id } = rawArgs as { id?: string };
      if (!id) return { result: { error: "No listing id provided." } };
      const { data, error } = await supabaseAdmin
        .from("listings")
        .select(LISTING_FIELDS)
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return { result: { error: "Listing not found." } };
      return { result: data, listingIds: [data.id] };
    }

    case "compare_listings": {
      const { ids } = rawArgs as { ids?: string[] };
      if (!ids || ids.length < 2)
        return { result: { error: "Need at least 2 listing ids to compare." } };
      const { data, error } = await supabaseAdmin
        .from("listings")
        .select(LISTING_FIELDS)
        .in("id", ids.slice(0, 4));
      if (error || !data) return { result: { error: "Couldn't load those listings." } };
      return { result: data, listingIds: data.map((r) => r.id) };
    }

    case "estimate_commute": {
      const { neighborhood, work_area } = rawArgs as { neighborhood?: string; work_area?: string };
      if (!neighborhood || !work_area)
        return { result: { error: "Need both a neighborhood and a work area." } };
      const from = findCentroid(neighborhood);
      const to = findCentroid(work_area);
      if (!from || !to) {
        return {
          result: {
            error: `No area-level distance data for "${!from ? neighborhood : work_area}". Answer generally instead of inventing a number.`,
          },
        };
      }
      const km = haversineKm(from, to);
      // Rough Nairobi peak-traffic heuristic, not a routing engine.
      const estimatedMinutes = Math.max(5, Math.round((km / 18) * 60));
      return {
        result: {
          straight_line_km: Math.round(km * 10) / 10,
          rough_drive_minutes: estimatedMinutes,
          note: "Straight-line estimate only, not live traffic routing.",
        },
      };
    }

    case "get_comparable_listings": {
      const args = rawArgs as { neighborhood?: string; type?: string; bedrooms?: number };
      if (!args.neighborhood) return { result: { error: "Need a neighborhood." } };
      let query = supabaseAdmin
        .from("listings")
        .select("rent, bedrooms, type, neighborhood, verified")
        .ilike("neighborhood", `%${args.neighborhood}%`)
        .in("status", ["available", "viewing", "occupied"])
        .limit(60);
      if (typeof args.bedrooms === "number") query = query.eq("bedrooms", args.bedrooms);
      const { data, error } = await query;
      if (error) return { result: { error: "Couldn't load comparable listings." } };

      let rows = data ?? [];
      if (args.type) {
        const wanted = args.type.toLowerCase();
        rows = rows.filter((r) => r.type.toLowerCase().includes(wanted));
      }
      if (rows.length === 0)
        return { result: { count: 0, note: "No comparable listings found nearby." } };

      const rents = rows.map((r) => r.rent).sort((a, b) => a - b);
      const avg = Math.round(rents.reduce((a, b) => a + b, 0) / rents.length);
      const median = rents[Math.floor(rents.length / 2)];
      return {
        result: {
          count: rows.length,
          average_rent: avg,
          median_rent: median,
          min_rent: rents[0],
          max_rent: rents[rents.length - 1],
        },
      };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}
