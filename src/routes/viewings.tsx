import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, CalendarDays, Check, X as XIcon, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMyViewings, useUpdateViewingStatus, type ViewingStatus } from "@/hooks/use-viewings";
import { toast } from "sonner";

export const Route = createFileRoute("/viewings")({
  head: () => ({ meta: [{ title: "Viewings — Keja" }] }),
  component: Viewings,
});

const statusClass: Record<ViewingStatus, string> = {
  pending: "bg-viewing/15 text-viewing",
  confirmed: "bg-available/10 text-available",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-primary/10 text-primary",
};

function Viewings() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { data: viewings = [], isLoading } = useMyViewings(user?.id);
  const update = useUpdateViewingStatus();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/auth" });
  }, [loading, isAuthenticated, navigate]);

  async function setStatus(id: string, status: ViewingStatus) {
    try {
      await update.mutateAsync({ id, status });
      toast.success(`Viewing ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-5 pb-16 pt-8">
      <div className="flex items-center gap-3">
        <Link to="/profile" className="press flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[22px] font-semibold tracking-tight">Your viewings</h1>
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      ) : viewings.length === 0 ? (
        <div className="mt-10 rounded-3xl bg-card p-6 text-center shadow-soft">
          <CalendarDays className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 text-sm font-semibold">No viewings yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Book one from any listing.</p>
        </div>
      ) : (
        <ul className="animate-fade-up mt-6 space-y-3">
          {viewings.map((v) => {
            const iAmLandlord = v.landlord_id === user?.id;
            const dt = new Date(v.scheduled_at);
            return (
              <li key={v.id} className="rounded-3xl bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to="/listing/$id" params={{ id: v.listing_id }} className="block truncate text-sm font-semibold">
                      {v.listings?.title ?? "Listing"}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {v.listings?.neighborhood ?? ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[v.status]}`}>
                    {v.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-muted-foreground">
                    {iAmLandlord ? `From ${v.tenantName ?? "tenant"}` : "You requested"}
                  </span>
                </div>
                {v.note && <p className="mt-2 rounded-2xl bg-muted p-2.5 text-xs text-muted-foreground">{v.note}</p>}

                {v.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    {iAmLandlord ? (
                      <>
                        <button
                          onClick={() => setStatus(v.id, "confirmed")}
                          className="press flex flex-1 items-center justify-center gap-1 rounded-2xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-pop"
                        >
                          <Check className="h-3.5 w-3.5" /> Confirm
                        </button>
                        <button
                          onClick={() => setStatus(v.id, "declined")}
                          className="press flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border py-2.5 text-xs font-semibold"
                        >
                          <XIcon className="h-3.5 w-3.5" /> Decline
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setStatus(v.id, "cancelled")}
                        className="press w-full rounded-2xl border border-border py-2.5 text-xs font-semibold"
                      >
                        Cancel request
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
