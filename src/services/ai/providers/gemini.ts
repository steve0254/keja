import type {
  ChatProvider,
  CompletionResult,
  ConversationTurn,
  ProviderCallParams,
  StreamParams,
  ToolCall,
} from "../types";
import { AiProviderError } from "../types";
import { iterateSseLines } from "./sse";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function turnsToContents(turns: ConversationTurn[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const turn of turns) {
    switch (turn.kind) {
      case "user":
        contents.push({ role: "user", parts: [{ text: turn.content }] });
        break;
      case "assistant_text":
        contents.push({ role: "model", parts: [{ text: turn.content }] });
        break;
      case "assistant_tool_calls":
        contents.push({
          role: "model",
          parts: turn.toolCalls.map((tc) => ({
            functionCall: { name: tc.name, args: tc.arguments },
          })),
        });
        break;
      case "tool_result": {
        const part: GeminiPart = {
          functionResponse: { name: turn.name, response: { content: turn.content ?? null } },
        };
        const last = contents[contents.length - 1];
        if (last && last.role === "user" && "functionResponse" in last.parts[0]) {
          last.parts.push(part);
        } else {
          contents.push({ role: "user", parts: [part] });
        }
        break;
      }
    }
  }
  return contents;
}

function apiKeyHeader() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError(
      "Missing GOOGLE_AI_API_KEY",
      "The AI assistant isn't configured yet — a Google AI API key is missing on the server.",
    );
  }
  return { "x-goog-api-key": apiKey, "Content-Type": "application/json" };
}

async function handleErrorResponse(response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  if (response.status === 429) {
    throw new AiProviderError(
      `Gemini 429: ${body}`,
      "The AI assistant is busy right now — try again in a moment.",
      429,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new AiProviderError(
      `Gemini ${response.status}: ${body}`,
      "The AI assistant's API key looks invalid.",
      response.status,
    );
  }
  throw new AiProviderError(
    `Gemini ${response.status}: ${body}`,
    "The AI assistant hit a snag — try again in a moment.",
    response.status,
  );
}

function extractCandidateParts(payload: unknown): GeminiPart[] {
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> })
    ?.candidates;
  return candidates?.[0]?.content?.parts ?? [];
}

export const geminiProvider: ChatProvider = {
  id: "gemini",

  // Pinned to gemini-2.5-flash-lite, which doesn't think by default. Gemini's
  // thinking models require echoing an opaque "thought signature" back on every
  // function call replayed in conversation history — real plumbing we don't
  // need for straightforward tool-routing calls like these, and picking a
  // non-thinking model sidesteps it (and the moving-target behavior of
  // "-latest" aliases across model generations) entirely.
  async complete({
    system,
    turns,
    tools,
    temperature,
    maxTokens,
  }: ProviderCallParams): Promise<CompletionResult> {
    const model = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash-lite";
    const requestBody = {
      systemInstruction: { parts: [{ text: system }] },
      contents: turnsToContents(turns),
      generationConfig: { temperature: temperature ?? 0.4, maxOutputTokens: maxTokens ?? 700 },
      ...(tools.length > 0
        ? {
            tools: [
              {
                functionDeclarations: tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters,
                })),
              },
            ],
          }
        : {}),
    };
    const response = await fetch(`${BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: apiKeyHeader(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error("[gemini] request body that failed:", JSON.stringify(requestBody));
      await handleErrorResponse(response);
    }

    const parts = extractCandidateParts(await response.json());
    const toolCalls: ToolCall[] = parts
      .filter((p): p is Extract<GeminiPart, { functionCall: unknown }> => "functionCall" in p)
      .map((p, i) => ({
        id: `${p.functionCall.name}-${i}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args ?? {},
      }));
    const text = parts
      .filter((p): p is Extract<GeminiPart, { text: unknown }> => "text" in p)
      .map((p) => p.text)
      .join("")
      .trim();

    return { text: text || null, toolCalls };
  },

  async *streamText({
    system,
    turns,
    temperature,
    maxTokens,
  }: StreamParams): AsyncGenerator<string> {
    const model = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash-lite";
    const response = await fetch(`${BASE_URL}/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: apiKeyHeader(),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turnsToContents(turns),
        generationConfig: { temperature: temperature ?? 0.5, maxOutputTokens: maxTokens ?? 700 },
      }),
    });

    if (!response.ok || !response.body) await handleErrorResponse(response);

    for await (const payload of iterateSseLines(response.body!)) {
      try {
        const parts = extractCandidateParts(JSON.parse(payload));
        for (const part of parts) {
          if ("text" in part && part.text) yield part.text;
        }
      } catch {
        // Ignore malformed keep-alive fragments.
      }
    }
  },
};
