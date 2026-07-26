import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

// Shown once per full page load (not on client-side route changes — RootComponent
// only mounts this on a fresh document load). Stays up until the initial route has
// actually finished loading its data AND a small minimum time has passed, so it
// never flashes for an instant but also never feels like a fixed, fake delay.
const MIN_VISIBLE_MS = 550;

export function AppSplash() {
  const routerReady = useRouterState({ select: (s) => s.status === "idle" });
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  const ready = routerReady && minTimeElapsed;

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      onTransitionEnd={() => {
        if (ready) setMounted(false);
      }}
      className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-8 bg-background transition-opacity duration-500 ease-out ${
        ready ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/25 blur-xl animate-glow-pulse" />
        <span className="absolute inset-2 rounded-full border border-primary/20" />
        <img src="/logo-icon.png" alt="" className="relative h-11 w-auto" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <img src="/logo-lockup.png" alt="Keja" className="block h-6 w-auto dark:hidden" />
        <img src="/logo-lockup-white.png" alt="Keja" className="hidden h-6 w-auto dark:block" />
        <div className="relative h-[3px] w-28 overflow-hidden rounded-full bg-muted">
          <span className="absolute inset-y-0 w-1/3 rounded-full bg-primary animate-shimmer-sweep" />
        </div>
      </div>
    </div>
  );
}
