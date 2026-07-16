import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-messaging";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Keja" }] }),
  component: Messages,
});

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "N";
}

function Messages() {
  const { user, isAuthenticated } = useAuth();
  const { data: threads = [], isLoading } = useConversations(user?.id);

  return (
    <AppShell>
      <header className="animate-fade px-5 pt-8">
        <h1 className="text-[26px] font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Talk directly to caretakers and landlords.</p>
        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search conversations"
            className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      {!isAuthenticated ? (
        <div className="animate-fade-up mt-10 px-5">
          <div className="rounded-3xl bg-card p-6 text-center shadow-soft">
            <MessageSquare className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3 text-sm font-semibold">Sign in to see your messages</p>
            <Link to="/auth" className="press mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-pop">
              Sign in
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        <p className="mt-10 px-5 text-sm text-muted-foreground">Loading…</p>
      ) : threads.length === 0 ? (
        <div className="animate-fade-up mt-10 px-5">
          <div className="rounded-3xl bg-card p-6 text-center shadow-soft">
            <p className="text-sm font-semibold">No conversations yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Message a landlord from any listing to start a thread.</p>
          </div>
        </div>
      ) : (
        <ul className="animate-fade-up mt-6 space-y-1 px-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                to="/messages/$id"
                params={{ id: t.id }}
                className="press flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-muted"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                  {initials(t.otherName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold">{t.otherName}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: false })}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {t.listings?.title ?? "Listing"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
