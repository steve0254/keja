import { Bot } from "lucide-react";
import type { AssistantEntry } from "@/hooks/useAI";

export function MessageBubble({ entry }: { entry: AssistantEntry }) {
  const mine = entry.role === "user";
  const showTyping = !mine && entry.isStreaming && !entry.content && !entry.status;

  return (
    <div className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      {!mine && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-soft ${
          mine
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : `rounded-tl-sm bg-card ${entry.isError ? "text-destructive" : ""}`
        }`}
      >
        {entry.status && !entry.content && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {entry.status}
          </span>
        )}
        {showTyping ? (
          <span className="flex items-center gap-1.5 py-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
        ) : (
          entry.content && (
            <>
              {entry.content}
              {entry.isStreaming && (
                <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" />
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
