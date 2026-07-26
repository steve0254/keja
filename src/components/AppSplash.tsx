import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

// Shown once per full page load (not on client-side route changes — RootComponent
// only mounts this on a fresh document load). Stays up until the initial route has
// actually finished loading its data AND a small minimum time has passed, so it
// reads as a deliberate brand moment rather than a flash or a fake fixed delay.
const MIN_VISIBLE_MS = 1100;

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
      className={`fixed inset-0 z-[2000] flex flex-col items-center justify-between overflow-hidden bg-[#0B1710] transition-opacity duration-500 ease-out ${
        ready ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        paddingTop: "max(4.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Ambient brand glow behind the badge */}
      <div className="pointer-events-none absolute left-1/2 top-[38%] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[90px]" />

      <span aria-hidden />

      <div className="relative animate-fade-up">
        <div className="flex h-24 w-24 rotate-45 items-center justify-center rounded-[1.75rem] bg-primary shadow-[0_25px_60px_-12px_rgba(50,152,42,0.55)]">
          <img src="/logo-icon-white.png" alt="" className="h-11 w-auto -rotate-45" />
        </div>
        <div className="absolute inset-0 -z-10 rotate-45 rounded-[1.75rem] bg-primary/40 blur-2xl animate-glow-pulse" />
      </div>

      <div className="relative flex w-full flex-col items-center gap-7 px-8">
        <div
          className="flex flex-col items-center gap-2 text-center animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <img src="/logo-lockup-white.png" alt="Keja" className="h-7 w-auto" />
          <p className="text-sm font-medium text-white/45">Find a home, live</p>
        </div>
        <span className="h-1 w-24 overflow-hidden rounded-full bg-white/15">
          <span className="block h-full w-1/3 rounded-full bg-white/70 animate-shimmer-sweep" />
        </span>
      </div>
    </div>
  );
}
