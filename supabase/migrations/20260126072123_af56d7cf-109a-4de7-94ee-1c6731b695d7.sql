-- Add related_products column to blogs table to store product IDs
ALTER TABLE public.blogs 
ADD COLUMN related_products uuid[] DEFAULT '{}'::uuid[];