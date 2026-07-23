import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp, Bot } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { MessageBubble } from "@/components/assistant/MessageBubble";
import { ListingResultsStrip } from "@/components/assistant/ListingResultsStrip";
import type { Listing } from "@/lib/listings";

const SUGGESTIONS = [
  "Bedsitter under KSh 15,000 in Kilimani",
  "2 bed with parking near Westlands",
  "Pet-friendly studio, own compound",
];

export function AiSearchChat({ listings }: { listings: Listing[] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { entries, isStreaming, send } = useAI("tenant");

  const lastEntry = entries[entries.length - 1];
  const lastContent = lastEntry?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, lastContent]);

  function submit(text: string) {
    if (!text.trim() || isStreaming) return;
    send(text);
    setInput("");
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
          <span className="block truncate text-xs text-muted-foreground">
            Describe your dream home in plain English
          </span>
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
                <p className="truncate text-[11px] text-muted-foreground">
                  House-hunting assistant
                </p>
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
                      Hi! Tell me your budget, area, and what you need — I'll search real vacancies
                      for you.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-10">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => submit(s)}
                        className="press rounded-2xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex flex-col gap-2 ${entry.role === "user" ? "items-end" : "items-start"}`}
                >
                  <MessageBubble entry={entry} />
                  {entry.listingIds && (
                    <ListingResultsStrip ids={entry.listingIds} listings={listings} />
                  )}
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
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
                disabled={isStreaming || !input.trim()}
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
