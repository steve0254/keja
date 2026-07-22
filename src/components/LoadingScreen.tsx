export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[1000] flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-background">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-border border-t-primary" />
        <img src="/logo-icon.png" alt="" className="h-8 w-auto animate-pulse" />
      </div>
      <p className="animate-fade text-xs font-medium tracking-wide text-muted-foreground">Loading Keja…</p>
    </div>
  );
}

export function ListingCardSkeleton({ variant = "default" }: { variant?: "default" | "wide" }) {
  return (
    <div
      className={`animate-pulse overflow-hidden rounded-3xl bg-card shadow-soft ${
        variant === "wide" ? "" : "w-[260px] shrink-0"
      }`}
    >
      <div className="aspect-[4/3] w-full bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded-full bg-muted" />
        <div className="h-3 w-1/2 rounded-full bg-muted" />
        <div className="h-5 w-2/5 rounded-full bg-muted" />
      </div>
    </div>
  );
}
