import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Share2, Heart, BadgeCheck, MapPin, Star, Wifi, Droplet, Car, Sofa, PawPrint,
  Home as HomeIcon, ShieldCheck, MessageCircle, X, CalendarDays,
} from "lucide-react";
import { statusMeta, formatKes } from "@/lib/listings";
import { useListing } from "@/hooks/use-listings";
import { useAuth } from "@/hooks/use-auth";
import { startConversation } from "@/hooks/use-messaging";
import { useRequestViewing } from "@/hooks/use-viewings";
import { toast } from "sonner";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({ meta: [{ title: "Listing — Keja" }] }),
  component: ListingDetail,
});

const amenityIcons: Record<string, typeof Wifi> = {
  "Wi-Fi": Wifi, "Water": Droplet, "Parking": Car, "Furnished": Sofa,
  "Pets": PawPrint, "Own compound": HomeIcon,
};

function ListingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: listing, isLoading } = useListing(id);
  const { user, isAuthenticated } = useAuth();
  const requestViewing = useRequestViewing();
  const [idx, setIdx] = useState(0);
  const [showBook, setShowBook] = useState(false);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("14:00");
  const [bookNote, setBookNote] = useState("");
  const [starting, setStarting] = useState(false);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!listing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Listing unavailable</p>
          <Link to="/" className="mt-3 inline-block text-sm font-medium text-primary">Back to home</Link>
        </div>
      </div>
    );
  }
  const meta = statusMeta[listing.status];
  const isOwner = user?.id && listing.owner_id === user.id;

  async function handleMessage() {
    if (!isAuthenticated || !user) return navigate({ to: "/auth" });
    if (!listing?.owner_id) return toast.error("Owner unavailable");
    if (isOwner) return toast.info("You own this listing");
    setStarting(true);
    try {
      const convId = await startConversation({
        listingId: listing.id,
        tenantId: user.id,
        landlordId: listing.owner_id,
      });
      navigate({ to: "/messages/$id", params: { id: convId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open chat");
    } finally {
      setStarting(false);
    }
  }

  function openBook() {
    if (!isAuthenticated) return navigate({ to: "/auth" });
    if (isOwner) return toast.info("You own this listing");
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setBookDate(d.toISOString().slice(0, 10));
    setShowBook(true);
  }

  async function submitBooking() {
    if (!user || !listing?.owner_id) return;
    const iso = new Date(`${bookDate}T${bookTime}:00`).toISOString();
    if (isNaN(new Date(iso).getTime())) return toast.error("Pick a valid date & time");
    try {
      await requestViewing.mutateAsync({
        listingId: listing.id,
        tenantId: user.id,
        landlordId: listing.owner_id,
        scheduledAt: iso,
        note: bookNote.trim() || undefined,
      });
      toast.success("Viewing requested — the landlord has been notified");
      setShowBook(false);
      setBookNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request viewing");
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background pb-32">
      <div className="relative h-[52svh] overflow-hidden">
        <img src={listing.gallery[idx]} alt={listing.title} className="animate-fade h-full w-full object-cover" key={idx} />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-6">
          <Link to="/" className="press glass flex h-11 w-11 items-center justify-center rounded-2xl">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex gap-2">
            <button className="press glass flex h-11 w-11 items-center justify-center rounded-2xl"><Share2 className="h-5 w-5" /></button>
            <button className="press glass flex h-11 w-11 items-center justify-center rounded-2xl"><Heart className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="absolute bottom-6 left-4">
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur ${meta.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName} animate-live-dot`} />
            {meta.label} now
          </span>
        </div>
        <div className="absolute bottom-6 right-4 flex gap-1.5">
          {listing.gallery.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/60"}`}
              aria-label={`Photo ${i + 1}`} />
          ))}
        </div>
      </div>

      <div className="animate-fade-up -mt-6 rounded-t-[32px] bg-background px-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {listing.neighborhood}{listing.address ? ` · ${listing.address}` : ""}
            </p>
          </div>
          {listing.verified && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { k: "Type", v: listing.type },
            { k: "Bedrooms", v: listing.bedrooms === 0 ? "Studio" : listing.bedrooms },
            { k: "Bathrooms", v: listing.bathrooms },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl bg-card p-3 text-center shadow-soft">
              <p className="text-sm font-semibold">{s.v}</p>
              <p className="text-[11px] text-muted-foreground">{s.k}</p>
            </div>
          ))}
        </div>

        {listing.description && (
          <section className="mt-8">
            <h2 className="text-base font-semibold tracking-tight">About this home</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
          </section>
        )}

        {listing.amenities.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold tracking-tight">What's included</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {listing.amenities.map((a) => {
                const Icon = amenityIcons[a] ?? HomeIcon;
                return (
                  <div key={a} className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-soft">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{a}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-base font-semibold tracking-tight">Move-in cost</h2>
          <div className="mt-3 divide-y divide-border rounded-3xl bg-card p-4 shadow-soft">
            {[
              { k: "Rent (1st month)", v: listing.rent },
              { k: "Deposit", v: listing.deposit },
              { k: "Service fee", v: 500 },
            ].map((r) => (
              <div key={r.k} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">{r.k}</span>
                <span className="font-medium">{formatKes(r.v)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 text-sm font-semibold">
              <span>Total to move in</span>
              <span>{formatKes(listing.rent + listing.deposit + 500)}</span>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold tracking-tight">Your caretaker</h2>
          <div className="mt-3 flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
              {listing.caretaker.initials}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{listing.caretaker.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-viewing text-viewing" /> {listing.caretaker.rating} · Responds in minutes
              </p>
            </div>
            <button
              onClick={handleMessage}
              disabled={starting}
              className="press flex items-center gap-1 rounded-2xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Message
            </button>
          </div>
        </section>

        <section className="mt-6 flex items-center gap-2 rounded-2xl bg-primary/5 p-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-xs text-foreground">GPS verified · Identity verified</p>
        </section>
      </div>

      <div className="glass fixed bottom-0 left-1/2 z-40 w-full max-w-[440px] -translate-x-1/2 border-t border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Rent</p>
            <p className="text-lg font-semibold tracking-tight">
              {formatKes(listing.rent)}<span className="text-xs font-medium text-muted-foreground">/mo</span>
            </p>
          </div>
          <button
            onClick={openBook}
            className="press ml-auto flex-1 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-pop"
          >
            Book viewing
          </button>
        </div>
      </div>

      {showBook && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm" onClick={() => setShowBook(false)}>
          <div
            className="animate-fade-up mx-auto w-full max-w-[440px] rounded-t-[32px] bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Book a viewing</h3>
              <button onClick={() => setShowBook(false)} className="press flex h-9 w-9 items-center justify-center rounded-2xl bg-card shadow-soft">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">The landlord will confirm shortly.</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    value={bookDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-card py-3 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</span>
                <input
                  type="time"
                  value={bookTime}
                  onChange={(e) => setBookTime(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Note (optional)</span>
              <textarea
                value={bookNote}
                onChange={(e) => setBookNote(e.target.value)}
                rows={3}
                placeholder="Any questions or preferences"
                className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <button
              onClick={submitBooking}
              disabled={requestViewing.isPending}
              className="press mt-5 w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-50"
            >
              {requestViewing.isPending ? "Sending…" : "Request viewing"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
