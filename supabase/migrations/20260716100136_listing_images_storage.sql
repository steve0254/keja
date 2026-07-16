-- Public storage bucket for listing photos. Files are stored under
-- {owner_user_id}/{filename}, and RLS restricts writes to a user's own folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload their own listing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can update their own listing images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete their own listing images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);
