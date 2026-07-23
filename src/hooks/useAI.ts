import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { assistantChat, type LandlordContext } from "@/services/ai/assistant";
import type { AssistantMode, AssistantStreamEvent, ChatMessage } from "@/services/ai/types";

export interface AssistantEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  listingIds?: string[];
  /** Transient "Searching listings…" text shown while tools run, before the reply starts streaming. */
  status?: string;
  isStreaming?: boolean;
  isError?: boolean;
}

function newId() {
  return Math.random().toString(36).slice(2);
}

function toHistory(entries: AssistantEntry[]): ChatMessage[] {
  return entries.filter((e) => !e.isError).map((e) => ({ role: e.role, content: e.content }));
}

/**
 * Drives a streaming conversation with the Keja AI assistant. Handles the
 * SSE parsing, incremental "typing" updates, tool-status messages, and
 * error normalization — components just render `entries`.
 */
export function useAI(mode: AssistantMode) {
  const [entries, setEntries] = useState<AssistantEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const callAssistantChat = useServerFn(assistantChat);
  const streamIdRef = useRef(0);

  const update = useCallback((id: string, patch: Partial<AssistantEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const send = useCallback(
    async (text: string, landlordContext?: LandlordContext) => {
      const clean = text.trim();
      if (!clean || isStreaming) return;

      const myStreamId = ++streamIdRef.current;
      const userEntry: AssistantEntry = { id: newId(), role: "user", content: clean };
      const assistantId = newId();

      setEntries((prev) => [
        ...prev,
        userEntry,
        { id: assistantId, role: "assistant", content: "", isStreaming: true },
      ]);
      setIsStreaming(true);

      try {
        const history = toHistory([...entries, userEntry]);
        const response = await callAssistantChat({
          data: { mode, messages: history, landlordContext },
        });
        const reader = response.body?.getReader();
        if (!reader) throw new Error("The assistant didn't return a response stream.");

        const decoder = new TextDecoder();
        let buffer = "";
        let sawDelta = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (streamIdRef.current !== myStreamId) {
            // A newer send() started (or reset() was called) — stop applying stale updates.
            await reader.cancel().catch(() => {});
            return;
          }
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (!payload) continue;

            let event: AssistantStreamEvent;
            try {
              event = JSON.parse(payload);
            } catch {
              continue;
            }

            switch (event.type) {
              case "status":
                update(assistantId, { status: event.message });
                break;
              case "delta":
                sawDelta = true;
                setEntries((prev) =>
                  prev.map((e) =>
                    e.id === assistantId
                      ? { ...e, content: e.content + event.text, status: undefined }
                      : e,
                  ),
                );
                break;
              case "listings":
                update(assistantId, { listingIds: event.ids });
                break;
              case "error":
                update(assistantId, {
                  content: event.message,
                  isError: true,
                  isStreaming: false,
                  status: undefined,
                });
                break;
              case "done":
                update(assistantId, { isStreaming: false, status: undefined });
                break;
            }
          }
        }

        if (!sawDelta) {
          // Defensive: stream closed with no delta and no explicit error/done event.
          update(assistantId, { isStreaming: false });
        }
      } catch (err) {
        if (streamIdRef.current !== myStreamId) return;
        update(assistantId, {
          content: err instanceof Error ? err.message : "Something went wrong — try again.",
          isError: true,
          isStreaming: false,
          status: undefined,
        });
      } finally {
        if (streamIdRef.current === myStreamId) setIsStreaming(false);
      }
    },
    [callAssistantChat, entries, isStreaming, mode, update],
  );

  const reset = useCallback(() => {
    streamIdRef.current++;
    setEntries([]);
    setIsStreaming(false);
  }, []);

  return { entries, isStreaming, send, reset };
}
