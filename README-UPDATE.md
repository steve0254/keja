# Keja update — wider rent range, photos, new property types

## 1. Copy these files into your project (overwrite existing ones)
- src/routes/search.tsx
- src/routes/add.tsx
- src/lib/listings.ts
- src/integrations/supabase/types.ts

Copy `supabase/migrations/*.sql` (the two new files) into your project's
`supabase/migrations/` folder too — don't overwrite your existing migrations,
these are new additions.

## 2. Run the new SQL in Supabase (required — this is what your app talks to)
Go to your Supabase project dashboard → SQL Editor → New query, then paste and
run each file's contents **one at a time, in this order**:

1. `20260716100135_add_room_and_commercial_types.sql`
2. `20260716100136_listing_images_storage.sql`

This adds the new property types (Single Room, Double Room, Shop, Warehouse,
Commercial Space) and creates the storage bucket + permissions for photo
uploads. Without this step, the new type buttons and photo uploads will fail.

## 3. Commit and push
```powershell
git add .
git commit -m "Widen rent range, add photo uploads, add room/commercial types"
git push
```
Cloudflare will auto-build and deploy from the push.
