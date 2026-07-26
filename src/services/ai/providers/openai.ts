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

const API_URL = "https://api.openai.com/v1/chat/completions";

type OpenAiMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenAiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

function turnsToMessages(system: string, turns: ConversationTurn[]): OpenAiMessage[] {
  const messages: OpenAiMessage[] = [{ role: "system", content: system }];
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
          content: null,
          tool_calls: turn.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) },
          })),
        });
        break;
      case "tool_result":
        messages.push({
          role: "tool",
          tool_call_id: turn.toolCallId,
          content: JSON.stringify(turn.content ?? null),
        });
        break;
    }
  }
  return messages;
}

function headers() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError(
      "Missing OPENAI_API_KEY",
      "The AI assistant isn't configured yet — an OpenAI API key is missing on the server.",
    );
  }
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function handleErrorResponse(response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  if (response.status === 429) {
    throw new AiProviderError(
      `OpenAI 429: ${body}`,
      "The AI assistant is busy right now — try again in a moment.",
      429,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new AiProviderError(
      `OpenAI ${response.status}: ${body}`,
      "The AI assistant's API key looks invalid.",
      response.status,
    );
  }
  throw new AiProviderError(
    `OpenAI ${response.status}: ${body}`,
    "The AI assistant hit a snag — try again in a moment.",
    response.status,
  );
}

export const openAiProvider: ChatProvider = {
  id: "openai",

  async complete({
    system,
    turns,
    tools,
    temperature,
    maxTokens,
  }: ProviderCallParams): Promise<CompletionResult> {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model,
        temperature: temperature ?? 0.4,
        max_tokens: maxTokens ?? 700,
        messages: turnsToMessages(system, turns),
        ...(tools.length > 0
          ? {
              tools: tools.map((t) => ({
                type: "function",
                function: { name: t.name, description: t.description, parameters: t.parameters },
              })),
              tool_choice: "auto",
            }
          : {}),
      }),
    });

    if (!response.ok) await handleErrorResponse(response);

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }>;
    };
    const message = payload.choices?.[0]?.message;
    const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }
      return { id: tc.id, name: tc.function.name, arguments: args };
    });

    return { text: message?.content ?? null, toolCalls };
  },

  async *streamText({
    system,
    turns,
    temperature,
    maxTokens,
  }: StreamParams): AsyncGenerator<string> {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const response = await fetch(API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model,
        temperature: temperature ?? 0.5,
        max_tokens: maxTokens ?? 700,
        stream: true,
        messages: turnsToMessages(system, turns),
      }),
    });

    if (!response.ok || !response.body) await handleErrorResponse(response);

    for await (const payload of iterateSseLines(response.body!)) {
      try {
        const chunk = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // Ignore malformed keep-alive fragments.
      }
    }
  },
};
