import { useEffect, useState } from "react";

/** One tileable "row" of house/building silhouettes, 900px wide so two
 * copies placed side by side (1800px total) can loop seamlessly with a
 * translateX(-50%) animation. */
function HouseRow() {
  return (
    <svg
      viewBox="0 0 900 220"
      preserveAspectRatio="none"
      className="h-full w-[900px] shrink-0"
      aria-hidden="true"
    >
      <g fill="currentColor">
        {/* cottage */}
        <rect x="10" y="140" width="80" height="80" />
        <polygon points="10,140 50,100 90,140" />
        <rect x="40" y="175" width="16" height="45" />
        {/* apartment block */}
        <rect x="110" y="60" width="70" height="160" />
        <rect x="122" y="80" width="14" height="14" />
        <rect x="146" y="80" width="14" height="14" />
        <rect x="122" y="106" width="14" height="14" />
        <rect x="146" y="106" width="14" height="14" />
        <rect x="122" y="132" width="14" height="14" />
        <rect x="146" y="132" width="14" height="14" />
        {/* bungalow, hip roof */}
        <rect x="205" y="150" width="120" height="70" />
        <polygon points="205,150 225,120 305,120 325,150" />
        <rect x="245" y="180" width="18" height="40" />
        {/* narrow townhouse */}
        <rect x="345" y="90" width="60" height="130" />
        <rect x="345" y="80" width="60" height="10" />
        <rect x="358" y="108" width="12" height="12" />
        <rect x="380" y="108" width="12" height="12" />
        <rect x="358" y="134" width="12" height="12" />
        <rect x="380" y="134" width="12" height="12" />
        {/* house with garage */}
        <rect x="425" y="130" width="100" height="90" />
        <polygon points="425,130 475,90 525,130" />
        <rect x="525" y="150" width="50" height="70" />
        {/* shopfront */}
        <rect x="575" y="140" width="120" height="80" />
        <rect x="575" y="133" width="120" height="8" />
        <rect x="605" y="175" width="60" height="45" />
        {/* apartment tower */}
        <rect x="715" y="40" width="80" height="180" />
        <rect x="728" y="58" width="14" height="14" />
        <rect x="754" y="58" width="14" height="14" />
        <rect x="728" y="84" width="14" height="14" />
        <rect x="754" y="84" width="14" height="14" />
        <rect x="728" y="110" width="14" height="14" />
        <rect x="754" y="110" width="14" height="14" />
        <rect x="728" y="136" width="14" height="14" />
        <rect x="754" y="136" width="14" height="14" />
        {/* small cottage to close the row */}
        <rect x="815" y="145" width="75" height="75" />
        <polygon points="815,145 852,110 890,145" />
      </g>
    </svg>
  );
}

function HouseSkyline({
  layerClassName,
  scrollClassName,
}: {
  layerClassName: string;
  scrollClassName: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden ${layerClassName}`}
    >
      <div className={`flex h-full w-max ${scrollClassName}`}>
        <HouseRow />
        <HouseRow />
      </div>
    </div>
  );
}

export function LoadingScreen({ isVisible = true }: { isVisible?: boolean }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-primary">
      {/* Houses in the background, two parallax layers drifting in opposite directions */}
      <HouseSkyline
        layerClassName="h-48 text-black/10"
        scrollClassName="animate-skyline-scroll-slow"
      />
      <HouseSkyline layerClassName="h-32 text-black/20" scrollClassName="animate-skyline-scroll" />

      {/* Green overlay wash for depth/contrast over the skyline */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/0 via-primary/50 to-primary" />

      {/* Logo */}
      <img
        src="/logo-icon.png"
        alt="Keja"
        className="relative z-10 mb-6 h-20 w-auto animate-logo-pop-in"
      />

      {/* App name */}
      <h1 className="relative z-10 animate-fade-in-up animation-delay-300 text-5xl font-semibold text-white tracking-tight">
        keja
      </h1>
      <p className="relative z-10 animate-fade-in-up animation-delay-450 mt-2 text-sm font-light text-white/70">
        Find a home, live
      </p>
    </div>
  );
}

export function ListingCardSkeleton({ variant = "compact" }: { variant?: "compact" | "wide" }) {
  if (variant === "wide") {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-soft animate-pulse">
        <div className="flex gap-3">
          <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-lg bg-muted" />
            <div className="h-3 w-1/2 rounded-lg bg-muted" />
            <div className="mt-3 h-4 w-1/3 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 rounded-2xl bg-card shadow-soft animate-pulse">
      <div className="h-40 rounded-xl bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 rounded-lg bg-muted" />
        <div className="h-3 w-2/3 rounded-lg bg-muted" />
        <div className="mt-3 h-4 w-1/2 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
