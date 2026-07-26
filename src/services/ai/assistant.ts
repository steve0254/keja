import { createServerFn } from "@tanstack/react-start";
import type { AssistantMode, AssistantStreamEvent, ChatMessage, ConversationTurn } from "./types";

// Runs server-side only. Provider API keys (OPENAI_API_KEY / ANTHROPIC_API_KEY /
// GOOGLE_AI_API_KEY) and the Supabase service-role client must never reach the
// client bundle — every module that touches them is dynamically imported
// inside the handler below, same pattern as src/integrations/supabase/client.server.ts.
// This file itself stays a plain .ts (not .server.ts) because `assistantChat`
// is imported client-side via useServerFn, same as the original src/lib/ai-search.ts.

const MAX_TOOL_ITERATIONS = 2;

export interface LandlordContext {
  type?: string;
  neighborhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  rent?: number;
  amenities?: string[];
  notes?: string;
}

interface AssistantChatInput {
  mode: AssistantMode;
  messages: ChatMessage[];
  landlordContext?: LandlordContext;
}

const STATUS_BY_TOOL: Record<string, string> = {
  search_listings: "Searching listings…",
  get_listing: "Loading listing details…",
  compare_listings: "Comparing listings…",
  estimate_commute: "Estimating commute…",
  get_comparable_listings: "Checking comparable rents…",
};

function encodeEvent(event: AssistantStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function sseResponse(events: AssistantStreamEvent[]): Response {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const assistantChat = createServerFn({ method: "POST" })
  .validator((data: AssistantChatInput) => data)
  .handler(async ({ data }): Promise<Response> => {
    const [
      { supabaseAdmin },
      { getClientIdentity },
      { checkRateLimit },
      { getAiProvider },
      { toolsForMode },
      { executeTool },
      { buildSystemPrompt, FINAL_ANSWER_HINT },
      { sanitizeHistory, historyToTurns },
      { AiProviderError },
    ] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./identity.server"),
      import("./rate-limit"),
      import("./providers"),
      import("./tools/definitions"),
      import("./tools/execute"),
      import("./prompts"),
      import("./conversation"),
      import("./types"),
    ]);

    const identity = await getClientIdentity();

    const needsAuth = data.mode === "landlord_description" || data.mode === "landlord_price";
    if (needsAuth && !identity.userId) {
      return sseResponse([
        { type: "error", message: "Sign in as a landlord to use this tool." },
        { type: "done" },
      ]);
    }

    const { allowed } = await checkRateLimit(supabaseAdmin, identity.rateLimitKey);
    if (!allowed) {
      return sseResponse([
        {
          type: "error",
          message: "You're sending messages a bit fast — wait a few seconds and try again.",
        },
        { type: "done" },
      ]);
    }

    const history = sanitizeHistory(data.messages);
    if (history.length === 0) {
      return sseResponse([
        {
          type: "error",
          message: "Say something first so the assistant knows what you're looking for.",
        },
        { type: "done" },
      ]);
    }

    let provider;
    try {
      provider = getAiProvider();
    } catch (err) {
      const message =
        err instanceof AiProviderError
          ? err.userMessage
          : "The AI assistant isn't available right now.";
      return sseResponse([{ type: "error", message }, { type: "done" }]);
    }

    const system = buildSystemPrompt(data.mode);
    const tools = toolsForMode(data.mode);

    let turns: ConversationTurn[] = historyToTurns(history);
    if (data.landlordContext) {
      turns = [
        {
          kind: "user",
          content: `Listing details as JSON: ${JSON.stringify(data.landlordContext)}`,
        },
        ...turns,
      ];
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: AssistantStreamEvent) => controller.enqueue(encodeEvent(event));
        try {
          const collectedListingIds = new Set<string>();
          let iterations = 0;

          while (iterations < MAX_TOOL_ITERATIONS) {
            const completion = await provider.complete({ system, turns, tools });
            if (completion.toolCalls.length === 0) break;

            turns = [...turns, { kind: "assistant_tool_calls", toolCalls: completion.toolCalls }];

            for (const call of completion.toolCalls) {
              send({ type: "status", message: STATUS_BY_TOOL[call.name] ?? "Working on it…" });
              const { result, listingIds } = await executeTool(
                call.name,
                call.arguments,
                supabaseAdmin,
              );
              listingIds?.forEach((id) => collectedListingIds.add(id));
              turns = [
                ...turns,
                { kind: "tool_result", toolCallId: call.id, name: call.name, content: result },
              ];
            }
            iterations++;
          }

          for await (const delta of provider.streamText({
            system: system + FINAL_ANSWER_HINT,
            turns,
          })) {
            send({ type: "delta", text: delta });
          }

          if (collectedListingIds.size > 0)
            send({ type: "listings", ids: [...collectedListingIds] });
          send({ type: "done" });
        } catch (err) {
          console.error("[assistant] request failed:", err instanceof Error ? err.message : err);
          const message =
            err instanceof AiProviderError
              ? err.userMessage
              : "The AI assistant hit a snag — try again.";
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });
