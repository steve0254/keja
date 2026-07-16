
REVOKE EXECUTE ON FUNCTION public.notify_on_message() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_on_viewing() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, authenticated, anon;
