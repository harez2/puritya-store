
-- Add brand and features columns to products table
ALTER TABLE public.products
ADD COLUMN brand text,
ADD COLUMN features jsonb DEFAULT '[]'::jsonb;
