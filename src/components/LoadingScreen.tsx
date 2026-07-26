import { useEffect, useState } from 'react'

export function LoadingScreen({ isVisible = true }: { isVisible?: boolean }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-600 to-green-700 flex flex-col items-center justify-center z-50">
      {/* Logo placeholder */}
      <div className="mb-4 w-16 h-16 bg-white rounded-3xl flex items-center justify-center">
        <span className="text-2xl font-bold text-green-600">K</span>
      </div>
      
      {/* App name */}
      <h1 className="text-5xl font-semibold text-white tracking-tight">keja</h1>
      <p className="text-white/60 text-sm mt-2">Find a home, live</p>
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
