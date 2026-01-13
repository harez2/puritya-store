-- Update the default country for addresses to Bangladesh
ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'Bangladesh';