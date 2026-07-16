import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useConversation, useMessages, useSendMessage } from "@/hooks/use-messaging";
import { toast } from "sonner";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({ meta: [{ title: "Conversation — Keja" }] }),
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { data: conv } = useConversation(id, user?.id);
  const { data: messages = [] } = useMessages(id);
  const send = useSendMessage(id);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/auth" });
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user) return;
    setBody("");
    try {
      await send.mutateAsync({ senderId: user.id, body: text });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
      setBody(text);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background">
      <header className="glass sticky top-0 z-40 flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/messages" className="press flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{conv?.otherName ?? "Conversation"}</p>
          <p className="truncate text-[11px] text-muted-foreground">{conv?.listings?.title ?? ""}</p>
        </div>
        {conv?.listing_id && (
          <Link to="/listing/$id" params={{ id: conv.listing_id }} className="text-xs font-semibold text-primary">
            View
          </Link>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 pb-24">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-xs text-muted-foreground">Say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-soft ${
                    mine ? "bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSend}
        className="glass fixed bottom-0 left-1/2 z-40 flex w-full max-w-[440px] -translate-x-1/2 items-center gap-2 border-t border-border px-4 py-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={send.isPending || !body.trim()}
          className="press flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-pop disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
