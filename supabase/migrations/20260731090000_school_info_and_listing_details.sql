-- Detailed property info requested by the team: full vs half bathrooms,
-- dimensions/layout, and what's actually included when a listing is marked
-- "Furnished". The existing `bathrooms` column is kept as-is (used by
-- existing bedroom/bathroom-count filtering) and backfilled from it.
ALTER TABLE public.listings
  ADD COLUMN full_bathrooms integer,
  ADD COLUMN half_bathrooms integer,
  ADD COLUMN square_footage integer,
  ADD COLUMN room_layout text,
  ADD COLUMN furnishing_details text;

UPDATE public.listings SET full_bathrooms = bathrooms WHERE full_bathrooms IS NULL;
UPDATE public.listings SET half_bathrooms = 0 WHERE half_bathrooms IS NULL;

-- SCHOOLS
-- There's no verified external data source for Kenyan school performance,
-- enrollment, or reviews, so this is crowd-sourced: schools are seeded/added
-- as basic directory entries, and `notes` is free text (not a verified
-- performance metric). Real signal comes from parent reviews below.
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  neighborhood text NOT NULL,
  school_type text NOT NULL DEFAULT 'Primary',
  student_count integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO authenticated, anon;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view schools" ON public.schools FOR SELECT USING (true);

CREATE INDEX schools_neighborhood_idx ON public.schools(neighborhood);

-- SCHOOL REVIEWS (parent reviews — the actual "performance" signal, since no
-- verified external source exists)
CREATE TABLE public.school_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id)
);
GRANT SELECT ON public.school_reviews TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.school_reviews TO authenticated;
GRANT ALL ON public.school_reviews TO service_role;
ALTER TABLE public.school_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view school reviews" ON public.school_reviews FOR SELECT USING (true);
CREATE POLICY "Users can add own school reviews" ON public.school_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own school reviews" ON public.school_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own school reviews" ON public.school_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX school_reviews_school_idx ON public.school_reviews(school_id);
