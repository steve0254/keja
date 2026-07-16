import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConversationRow = {
  id: string;
  listing_id: string;
  tenant_id: string;
  landlord_id: string;
  last_message_at: string;
  created_at: string;
  listings: { title: string; neighborhood: string; images: string[] } | null;
  otherName: string;
  otherAvatar: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

async function attachProfiles(
  rows: Array<{
    id: string;
    listing_id: string;
    tenant_id: string;
    landlord_id: string;
    last_message_at: string;
    created_at: string;
    listings: { title: string; neighborhood: string; images: string[] } | null;
  }>,
  currentUserId: string,
): Promise<ConversationRow[]> {
  if (rows.length === 0) return [];
  const otherIds = Array.from(
    new Set(rows.map((r) => (r.tenant_id === currentUserId ? r.landlord_id : r.tenant_id))),
  );
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", otherIds);
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));
  return rows.map((r) => {
    const otherId = r.tenant_id === currentUserId ? r.landlord_id : r.tenant_id;
    const p = byId.get(otherId);
    return {
      ...r,
      otherName: p?.full_name ?? "Keja user",
      otherAvatar: p?.avatar_url ?? null,
    };
  });
}

export function useConversations(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`conversations:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", userId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: async (): Promise<ConversationRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `id, listing_id, tenant_id, landlord_id, last_message_at, created_at,
           listings ( title, neighborhood, images )`,
        )
        .or(`tenant_id.eq.${userId},landlord_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return attachProfiles((data ?? []) as never, userId);
    },
    enabled: !!userId,
  });
}

export function useConversation(conversationId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId || !currentUserId) return null;
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `id, listing_id, tenant_id, landlord_id, last_message_at, created_at,
           listings ( title, neighborhood, images )`,
        )
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [row] = await attachProfiles([data as never], currentUserId);
      return row;
    },
    enabled: !!conversationId && !!currentUserId,
  });
}

export function useMessages(conversationId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          qc.setQueryData<MessageRow[]>(["messages", conversationId], (prev) => {
            const next = payload.new as MessageRow;
            if (prev?.some((m) => m.id === next.id)) return prev;
            return [...(prev ?? []), next];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, qc]);

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<MessageRow[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MessageRow[];
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ senderId, body }: { senderId: string; body: string }) => {
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: senderId, body });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", conversationId] }),
  });
}

/** Get or create the conversation between the current tenant and the listing owner. */
export async function startConversation(params: {
  listingId: string;
  tenantId: string;
  landlordId: string;
}): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", params.listingId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      listing_id: params.listingId,
      tenant_id: params.tenantId,
      landlord_id: params.landlordId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
