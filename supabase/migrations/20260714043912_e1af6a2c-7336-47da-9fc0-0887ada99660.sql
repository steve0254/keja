
-- CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view conversations" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);
CREATE POLICY "Tenant starts conversation" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = tenant_id
    AND landlord_id = (SELECT owner_id FROM public.listings WHERE id = listing_id)
  );
CREATE POLICY "Participants update conversation" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.tenant_id OR auth.uid() = c.landlord_id)));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (auth.uid() = c.tenant_id OR auth.uid() = c.landlord_id))
  );

-- Bump conversation last_message_at
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- VIEWINGS
CREATE TYPE viewing_status AS ENUM ('pending','confirmed','declined','cancelled','completed');
CREATE TABLE public.viewings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status viewing_status NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viewings TO authenticated;
GRANT ALL ON public.viewings TO service_role;
ALTER TABLE public.viewings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view viewings" ON public.viewings FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);
CREATE POLICY "Tenant requests viewing" ON public.viewings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = tenant_id
    AND landlord_id = (SELECT owner_id FROM public.listings WHERE id = listing_id)
  );
CREATE POLICY "Participants update viewing" ON public.viewings FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);
CREATE POLICY "Landlord deletes viewing" ON public.viewings FOR DELETE TO authenticated
  USING (auth.uid() = landlord_id);
CREATE TRIGGER trg_viewings_updated
BEFORE UPDATE ON public.viewings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications view" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Own notifications delete" ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Auto-notify recipient on new message
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.conversations%ROWTYPE;
  recipient uuid;
  sender_name text;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN NEW.sender_id = c.tenant_id THEN c.landlord_id ELSE c.tenant_id END;
  SELECT COALESCE(full_name, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (recipient, 'message', sender_name || ' sent you a message', LEFT(NEW.body, 140), '/messages/' || c.id::text);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- Auto-notify landlord on new viewing request
CREATE OR REPLACE FUNCTION public.notify_on_viewing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  listing_title text;
BEGIN
  SELECT title INTO listing_title FROM public.listings WHERE id = NEW.listing_id;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.landlord_id, 'viewing_request', 'New viewing request', 'For ' || listing_title, '/listing/' || NEW.listing_id::text);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_viewing
AFTER INSERT ON public.viewings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_viewing();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.viewings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
