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

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMessage = { role: "user" | "assistant"; content: string | AnthropicBlock[] };

/** Anthropic requires every tool_result for a given assistant turn to live
 * in a single following user message, so consecutive `tool_result` turns
 * get merged rather than emitted as separate messages. */
function turnsToMessages(turns: ConversationTurn[]): AnthropicMessage[] {
  const messages: AnthropicMessage[] = [];

  for (const turn of turns) {
    switch (turn.kind) {
      case "user":
        messages.push({ role: "user", content: turn.content });
        break;
      case "assistant_text":
        messages.push({ role: "assistant", content: turn.content });
        break;
      case "assistant_tool_calls":
        messages.push({
          role: "assistant",
          content: turn.toolCalls.map((tc) => ({
            type: "tool_use" as const,
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })),
        });
        break;
      case "tool_result": {
        const block: AnthropicBlock = {
          type: "tool_result",
          tool_use_id: turn.toolCallId,
          content: JSON.stringify(turn.content ?? null),
        };
        const last = messages[messages.length - 1];
        if (last && last.role === "user" && Array.isArray(last.content)) {
          last.content.push(block);
        } else {
          messages.push({ role: "user", content: [block] });
        }
        break;
      }
    }
  }
  return messages;
}

function headers() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiProviderError(
      "Missing ANTHROPIC_API_KEY",
      "The AI assistant isn't configured yet — an Anthropic API key is missing on the server.",
    );
  }
  return {
    "x-api-key": apiKey,
    "anthropic-version": API_VERSION,
    "Content-Type": "application/json",
  };
}

async function handleErrorResponse(response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  if (response.status === 429) {
    throw new AiProviderError(
      `Anthropic 429: ${body}`,
      "The AI assistant is busy right now — try again in a moment.",
      429,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new AiProviderError(
      `Anthropic ${response.status}: ${body}`,
      "The AI assistant's API key looks invalid.",
      response.status,
    );
  }
  throw new AiProviderError(
    `Anthropic ${response.status}: ${body}`,
    "The AI assistant hit a snag — try again in a moment.",
    response.status,
  );
}

export const anthropicProvider: ChatProvider = {
  id: "anthropic",

  async complete({
    system,
    turns,
    tools,
    temperature,
    maxTokens,
  }: ProviderCallParams): Promise<CompletionResult> {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model,
        system,
        max_tokens: maxTokens ?? 700,
        temperature: temperature ?? 0.4,
        messages: turnsToMessages(turns),
        ...(tools.length > 0
          ? {
              tools: tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.parameters,
              })),
            }
          : {}),
      }),
    });

    if (!response.ok) await handleErrorResponse(response);

    const payload = (await response.json()) as { content?: AnthropicBlock[] };
    const blocks = payload.content ?? [];
    const toolCalls: ToolCall[] = blocks
      .filter((b): b is Extract<AnthropicBlock, { type: "tool_use" }> => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, arguments: b.input }));
    const text = blocks
      .filter((b): b is Extract<AnthropicBlock, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
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
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model,
        system,
        max_tokens: maxTokens ?? 700,
        temperature: temperature ?? 0.5,
        stream: true,
        messages: turnsToMessages(turns),
      }),
    });

    if (!response.ok || !response.body) await handleErrorResponse(response);

    for await (const payload of iterateSseLines(response.body!)) {
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          yield event.delta.text;
        }
      } catch {
        // Ignore malformed keep-alive fragments.
      }
    }
  },
};
