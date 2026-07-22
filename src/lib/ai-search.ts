import { createServerFn } from "@tanstack/react-start";

// AI house-hunting assistant. Runs server-side only (Lovable AI Gateway calls
// use LOVABLE_API_KEY, which must never reach the client bundle) — always
// dynamically import server-only modules inside the handler, same pattern as
// src/integrations/supabase/client.server.ts.

export type AiChatRole = "user" | "assistant";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface AiSearchResult {
  reply: string;
  listingIds: string[];
}

const MODEL = "google/gemini-2.5-flash";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_LISTINGS_IN_PROMPT = 80;
const MAX_HISTORY_MESSAGES = 12;

function buildSystemPrompt(listingsJson: string) {
  return [
    "You are the Keja AI house-hunting assistant, built into a rental app for Nairobi, Kenya.",
    "You help renters find a home from Keja's live listings only — never invent listings.",
    "Rent figures are in Kenyan Shillings (KES). Be warm, brief, and concrete — 2-4 sentences max.",
    "Ask a short follow-up question only when the request is too vague to match anything (e.g. no budget, area, or type at all).",
    "When you have candidates, recommend the best 1-4 matches and briefly say why (budget fit, area, amenities).",
    "If nothing in the listings matches, say so plainly and suggest what to loosen (budget, area, bedrooms).",
    "",
    `Here are the current available listings as JSON (id, title, neighborhood, type, rent in KES, bedrooms, bathrooms, amenities, verified):`,
    listingsJson,
    "",
    "Respond with ONLY a single JSON object, no markdown fences, no extra text, in exactly this shape:",
    `{"reply": "your conversational reply as plain text", "listingIds": ["id1", "id2"]}`,
    `"listingIds" must only contain ids taken verbatim from the listings JSON above (empty array if none match or none apply yet).`,
  ].join("\n");
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export const aiSearchChat = createServerFn({ method: "POST" })
  .validator((data: { messages: AiChatMessage[] }) => data)
  .handler(async ({ data }): Promise<AiSearchResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "The AI assistant isn't set up yet — enable the built-in AI connector for this project in Lovable, then try again.",
      );
    }

    const history = (data.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }));

    if (history.length === 0) {
      throw new Error("Say something first so the assistant knows what you're looking for.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("listings")
      .select("id, title, neighborhood, type, rent, bedrooms, bathrooms, amenities, verified, status")
      .in("status", ["available", "viewing"])
      .order("created_at", { ascending: false })
      .limit(MAX_LISTINGS_IN_PROMPT);

    if (error) throw new Error("Couldn't load listings for the assistant right now.");

    const knownIds = new Set((rows ?? []).map((r) => r.id));
    const compactListings = (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      neighborhood: r.neighborhood,
      type: r.type,
      rent: r.rent,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      amenities: r.amenities ?? [],
      verified: r.verified,
    }));

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 700,
        messages: [{ role: "system", content: buildSystemPrompt(JSON.stringify(compactListings)) }, ...history],
      }),
    });

    if (response.status === 429) {
      throw new Error("The AI assistant is getting a lot of requests right now — try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits for this project have run out — add credits in Lovable to keep using the assistant.");
    }
    if (!response.ok) {
      throw new Error("The AI assistant hit a snag — try again in a moment.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = extractJsonObject(content) as Partial<AiSearchResult> | null;

    if (parsed && typeof parsed.reply === "string") {
      const listingIds = Array.isArray(parsed.listingIds)
        ? parsed.listingIds.filter((id): id is string => typeof id === "string" && knownIds.has(id))
        : [];
      return { reply: parsed.reply, listingIds };
    }

    // Model didn't follow the JSON contract — fall back to raw text, no matches.
    return { reply: content || "Sorry, I didn't quite catch that — could you rephrase?", listingIds: [] };
  });
