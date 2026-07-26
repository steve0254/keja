import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface ClientIdentity {
  userId: string | null;
  /** Bucket key for rate limiting: verified user id when signed in, else a best-effort IP. */
  rateLimitKey: string;
}

async function verifyUserId(token: string): Promise<string | null> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || token.split(".").length !== 3) return null;

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

/**
 * Unlike `requireSupabaseAuth`, this never throws — the tenant search
 * assistant works for signed-out browsers too. Callers that need a signed-in
 * user (landlord tools) check `identity.userId` themselves.
 */
export async function getClientIdentity(): Promise<ClientIdentity> {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const userId = token ? await verifyUserId(token) : null;

  if (userId) return { userId, rateLimitKey: `user:${userId}` };

  const ip =
    request?.headers.get("cf-connecting-ip") ??
    request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return { userId: null, rateLimitKey: `ip:${ip}` };
}
