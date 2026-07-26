import type { ChatMessage, ConversationTurn } from "./types";

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;

/** Sanitizes client-supplied history: right roles, right shape, bounded size. */
export function sanitizeHistory(messages: ChatMessage[]): ChatMessage[] {
  return (messages ?? [])
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_LENGTH) }));
}

export function historyToTurns(messages: ChatMessage[]): ConversationTurn[] {
  return messages.map((m) =>
    m.role === "user"
      ? { kind: "user" as const, content: m.content }
      : { kind: "assistant_text" as const, content: m.content },
  );
}
