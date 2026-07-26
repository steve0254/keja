import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Cloudflare Workers are stateless per-request across many instances, so an
// in-memory counter would not actually enforce a limit in production. We
// enforce it with a small atomic Postgres function instead (see migration
// 20260722120000_ai_rate_limits.sql) — cheap, and correct under concurrency
// without needing Redis or a Durable Object.

const DEFAULT_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 12);
const WINDOW_SECONDS = 60;

export interface RateLimitResult {
  allowed: boolean;
}

export async function checkRateLimit(
  supabaseAdmin: SupabaseClient<Database>,
  clientKey: string,
): Promise<RateLimitResult> {
  const { data, error } = await supabaseAdmin.rpc("check_ai_rate_limit", {
    p_client_key: clientKey,
    p_limit: DEFAULT_LIMIT,
    p_window_seconds: WINDOW_SECONDS,
  });

  if (error) {
    // Fail open rather than breaking the assistant if the rate-limit
    // migration hasn't been applied yet — but log loudly so it gets fixed.
    console.error("[ai-rate-limit] check failed, allowing request:", error.message);
    return { allowed: true };
  }

  return { allowed: data === true };
}
