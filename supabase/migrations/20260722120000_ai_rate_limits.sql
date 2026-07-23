-- AI assistant rate limiting. Cloudflare Workers are stateless across many
-- edge instances, so an in-memory counter in application code cannot
-- actually enforce a limit — this tracks request timestamps per client key
-- (a signed-in user id, or a hashed/raw IP for anonymous visitors) in
-- Postgres instead, and prunes old rows automatically on each check.

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_rate_limits_client_key_created_at_idx
  ON public.ai_rate_limits (client_key, created_at DESC);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: this table is only ever touched by the
-- server-side service-role client (via the SECURITY DEFINER function
-- below), never directly by client code.

-- Atomically checks whether `p_client_key` has made fewer than `p_limit`
-- requests in the last `p_window_seconds`. If under budget, records this
-- request and returns true; otherwise returns false without recording it.
-- The advisory lock serializes concurrent calls for the same key so two
-- simultaneous requests can't both slip through at the boundary.
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_client_key text,
  p_limit int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_client_key));

  DELETE FROM public.ai_rate_limits
  WHERE created_at < now() - make_interval(secs => p_window_seconds * 4);

  SELECT count(*) INTO current_count
  FROM public.ai_rate_limits
  WHERE client_key = p_client_key
    AND created_at > now() - make_interval(secs => p_window_seconds);

  IF current_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_rate_limits (client_key) VALUES (p_client_key);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(text, int, int) TO service_role;
