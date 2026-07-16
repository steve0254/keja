import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Bell, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Keja" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { data: items = [], isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead(user?.id);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/auth" });
  }, [loading, isAuthenticated, navigate]);

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-5 pb-16 pt-8">
      <div className="flex items-center gap-3">
        <Link to="/profile" className="press flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[22px] font-semibold tracking-tight">Notifications</h1>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="press ml-auto text-xs font-semibold text-primary"
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl bg-card p-6 text-center shadow-soft">
          <Bell className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 text-sm font-semibold">You're all caught up</p>
        </div>
      ) : (
        <ul className="animate-fade-up mt-6 space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  if (!n.read_at) markRead.mutate(n.id);
                  if (n.link) navigate({ to: n.link });
                }}
                className={`press flex w-full items-start gap-3 rounded-2xl p-4 text-left shadow-soft ${
                  n.read_at ? "bg-card" : "bg-primary/5"
                }`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold">{n.title}</span>
                    {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  {n.body && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </span>
                {n.link && <ExternalLink className="mt-1 h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
