import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ViewingStatus = "pending" | "confirmed" | "declined" | "cancelled" | "completed";

export type Viewing = {
  id: string;
  listing_id: string;
  tenant_id: string;
  landlord_id: string;
  scheduled_at: string;
  status: ViewingStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  listings?: { title: string; neighborhood: string; images: string[] } | null;
  tenantName?: string | null;
};

export function useMyViewings(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`viewings:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "viewings" }, () =>
        qc.invalidateQueries({ queryKey: ["viewings", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  return useQuery({
    queryKey: ["viewings", userId],
    queryFn: async (): Promise<Viewing[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("viewings")
        .select(
          `id, listing_id, tenant_id, landlord_id, scheduled_at, status, note, created_at, updated_at,
           listings ( title, neighborhood, images )`,
        )
        .or(`tenant_id.eq.${userId},landlord_id.eq.${userId}`)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Viewing[];
      const tenantIds = Array.from(new Set(rows.map((r) => r.tenant_id)));
      if (tenantIds.length === 0) return rows;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", tenantIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return rows.map((r) => ({ ...r, tenantName: byId.get(r.tenant_id) ?? null }));
    },
    enabled: !!userId,
  });
}

export function useRequestViewing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      listingId: string;
      tenantId: string;
      landlordId: string;
      scheduledAt: string;
      note?: string;
    }) => {
      const { error } = await supabase.from("viewings").insert({
        listing_id: v.listingId,
        tenant_id: v.tenantId,
        landlord_id: v.landlordId,
        scheduled_at: v.scheduledAt,
        note: v.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viewings"] }),
  });
}

export function useUpdateViewingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ViewingStatus }) => {
      const { error } = await supabase.from("viewings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viewings"] }),
  });
}
