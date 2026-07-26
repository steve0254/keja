import { useEffect, useState } from 'react'

export function LoadingScreen({ isVisible = true }: { isVisible?: boolean }) {
  const [displayedText, setDisplayedText] = useState('')
  const fullText = 'Loading...'

  useEffect(() => {
    if (!isVisible) return

    let index = 0
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index))
        index++
      } else {
        index = 0
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50">
      {/* Content Container */}
      <div className="flex flex-col items-center gap-8">
        {/* Animated Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-spin" />
          <div className="absolute inset-2 bg-slate-800 rounded-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-spin opacity-50 blur-md" />
        </div>

        {/* Loading Text with Animation */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2 h-8">
            {displayedText}
            <span className="animate-pulse">|</span>
          </h2>
          <p className="text-slate-400 text-sm">Please wait...</p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-slate-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
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
