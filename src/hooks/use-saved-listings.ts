import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "keja:saved-listings";

function readSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Lightweight "save for later" using localStorage — there's no favorites
 * table in the database yet, so this keeps the Heart buttons genuinely
 * functional (persisted across visits on this device) without needing a
 * migration. Easy to swap for a real Supabase-backed table later if wanted.
 */
export function useSavedListings() {
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setSaved(readSaved());
  }, []);

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage might be unavailable (private browsing, quota) — fail silently.
      }
      return next;
    });
  }, []);

  return { saved, isSaved, toggle };
}
