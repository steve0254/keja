export function LoadingScreen({ isVisible = true }: { isVisible?: boolean }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-green-600 flex flex-col items-center justify-center z-50 overflow-hidden">
      <style>{`
        @keyframes keja-pin-drop {
          0% { opacity: 0; transform: translateY(-28px) scale(0.85); }
          60% { opacity: 1; transform: translateY(4px) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes keja-pin-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }
        @keyframes keja-fade-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes keja-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .keja-pin {
          animation: keja-pin-drop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both,
                     keja-pin-breathe 2.6s ease-in-out 700ms infinite;
        }
        .keja-title {
          animation: keja-fade-up 500ms ease-out 320ms both;
        }
        .keja-tagline {
          animation: keja-fade-up 500ms ease-out 460ms both;
        }
        .keja-dots {
          animation: keja-fade-up 500ms ease-out 600ms both;
        }
        .keja-dot {
          animation: keja-dot 1.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .keja-pin, .keja-title, .keja-tagline, .keja-dots, .keja-dot {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <img
        src="/logo-icon.png"
        alt="Keja"
        className="keja-pin w-20 h-20 mb-6"
      />

      <h1 className="keja-title text-5xl font-semibold text-white tracking-tight">
        keja
      </h1>
      <p className="keja-tagline text-white/70 text-sm mt-2 font-light">
        Find a home, live
      </p>

      <div className="keja-dots flex gap-1.5 mt-8">
        <span className="keja-dot w-2 h-2 rounded-full bg-white" style={{ animationDelay: '0ms' }} />
        <span className="keja-dot w-2 h-2 rounded-full bg-white" style={{ animationDelay: '160ms' }} />
        <span className="keja-dot w-2 h-2 rounded-full bg-white" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  )
}

export function ListingCardSkeleton({ variant = 'compact' }: { variant?: 'compact' | 'wide' }) {
  if (variant === 'wide') {
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
    )
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
  )
}
