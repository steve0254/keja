import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adaptListing, type DbListing, type Listing } from "@/lib/listings";

export function useListings() {
  return useQuery({
    queryKey: ["listings"],
    queryFn: async (): Promise<Listing[]> => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .in("status", ["available", "viewing"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DbListing[]).map((r, i) => adaptListing(r, i));
    },
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: async (): Promise<Listing | null> => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? adaptListing(data as DbListing) : null;
    },
    enabled: !!id,
  });
}

export function useMyListings(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-listings", userId],
    queryFn: async (): Promise<Listing[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DbListing[]).map((r, i) => adaptListing(r, i));
    },
    enabled: !!userId,
  });
}
