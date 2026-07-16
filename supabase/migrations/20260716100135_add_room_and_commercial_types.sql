-- Expand listing_type with single/double rooms and commercial space types.
-- ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a
-- statement that uses the new value, but each of these is safe on its own.
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'Single Room';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'Double Room';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'Shop';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'Warehouse';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'Commercial Space';
