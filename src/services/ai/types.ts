// Provider-agnostic types shared across the AI service layer. Nothing in
// this file knows about OpenAI, Anthropic, or Gemini — that's the point.
// Provider adapters (see ./providers) translate to/from these shapes so the
// orchestrator (assistant.server.ts) never has to think about wire formats.

export type ChatRole = "user" | "assistant";

/** A single turn of plain chat history as the client sends/receives it. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** A tool the model is allowed to call, described in JSON-Schema-ish form. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Neutral, replayable conversation representation. Every provider adapter
 * converts a `ConversationTurn[]` into its own wire format from scratch on
 * every call — turns are never provider-specific, which is what lets the
 * orchestrator run the same tool-calling loop against any provider.
 */
export type ConversationTurn =
  | { kind: "user"; content: string }
  | { kind: "assistant_text"; content: string }
  | { kind: "assistant_tool_calls"; toolCalls: ToolCall[] }
  | { kind: "tool_result"; toolCallId: string; name: string; content: unknown };

export interface CompletionResult {
  /** Direct text reply. Present when the model didn't ask for any tools. */
  text: string | null;
  toolCalls: ToolCall[];
}

export interface ProviderCallParams {
  system: string;
  turns: ConversationTurn[];
  tools: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface StreamParams {
  system: string;
  turns: ConversationTurn[];
  temperature?: number;
  maxTokens?: number;
}

/** One normalized adapter per AI provider. All calls are stateless. */
export interface ChatProvider {
  id: "openai" | "anthropic" | "gemini";
  /** Non-streaming call used for the "decide what to do" / tool-use step. */
  complete(params: ProviderCallParams): Promise<CompletionResult>;
  /** Streaming call used once we know the final answer needs no more tools. */
  streamText(params: StreamParams): AsyncGenerator<string>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** Events sent to the client over the assistant's SSE stream. */
export type AssistantStreamEvent =
  | { type: "status"; message: string }
  | { type: "delta"; text: string }
  | { type: "listings"; ids: string[] }
  | { type: "done" }
  | { type: "error"; message: string };

export type AssistantMode = "tenant" | "landlord_description" | "landlord_price";
