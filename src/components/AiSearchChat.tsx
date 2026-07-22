import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X, ArrowUp, Bot } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { aiSearchChat, type AiChatMessage } from "@/lib/ai-search";
import type { Listing } from "@/lib/listings";

type ChatEntry = AiChatMessage & { id: string; listingIds?: string[]; isError?: boolean };

const SUGGESTIONS = [
  "Bedsitter under KSh 15,000 in Kilimani",
  "2 bed with parking near Westlands",
  "Pet-friendly studio, own compound",
];

function newId() {
  return Math.random().toString(36).slice(2);
}

export function AiSearchChat({ listings }: { listings: Listing[] }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const callAiSearchChat = useServerFn(aiSearchChat);

  const mutation = useMutation({
    mutationFn: (history: ChatEntry[]) =>
      callAiSearchChat({ data: { messages: history.map(({ role, content }) => ({ role, content })) } }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, mutation.isPending]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || mutation.isPending) return;
    const userEntry: ChatEntry = { id: newId(), role: "user", content: clean };
    const nextHistory = [...entries, userEntry];
    setEntries(nextHistory);
    setInput("");
    mutation.mutate(nextHistory, {
      onSuccess: (result) => {
        setEntries((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: result.reply, listingIds: result.listingIds },
        ]);
      },
      onError: (err) => {
        setEntries((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: err instanceof Error ? err.message : "Something went wrong — try again.",
            isError: true,
          },
        ]);
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex w-full items-center gap-3 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3.5 text-left shadow-soft"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Ask Keja AI</span>
          <span className="block truncate text-xs text-muted-foreground">Describe your dream home in plain English</span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[999] flex justify-center bg-background/40 backdrop-blur-sm">
          <div className="flex h-[100svh] w-full max-w-[440px] flex-col bg-background">
            <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Keja AI</p>
                <p className="truncate text-[11px] text-muted-foreground">House-hunting assistant</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="press flex h-9 w-9 items-center justify-center rounded-2xl bg-card shadow-soft"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {entries.length === 0 && (
                <div className="animate-fade-up space-y-4">
                  <div className="flex gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-card px-4 py-2.5 text-sm shadow-soft">
                      Hi! Tell me your budget, area, and what you need — I'll match you with real vacancies.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-10">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="press rounded-2xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entries.map((entry) => {
                const mine = entry.role === "user";
                const matched = entry.listingIds
                  ?.map((id) => listings.find((l) => l.id === id))
                  .filter((l): l is Listing => Boolean(l));
                return (
                  <div key={entry.id} className={`flex flex-col gap-2 ${mine ? "items-end" : "items-start"}`}>
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
                        {entry.content}
                      </div>
                    </div>
                    {matched && matched.length > 0 && (
                      <div className="flex w-full gap-3 overflow-x-auto pb-1 pl-10">
                        {matched.map((l) => (
                          <ListingCard key={l.id} listing={l} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {mutation.isPending && (
                <div className="flex gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-card px-4 py-3 shadow-soft">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="glass flex items-center gap-2 border-t border-border px-4 py-3"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. 1 bedroom near town, under 20k"
                className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={mutation.isPending || !input.trim()}
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-pop disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
