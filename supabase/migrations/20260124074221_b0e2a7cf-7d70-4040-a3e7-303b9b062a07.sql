-- Add display_order column to products table for custom ordering
ALTER TABLE public.products 
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Set initial display order based on creation date (newer products first)
WITH ordered_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM public.products
)
UPDATE public.products 
SET display_order = ordered_products.row_num
FROM ordered_products 
WHERE public.products.id = ordered_products.id;

-- Create index for faster ordering queries
CREATE INDEX idx_products_display_order ON public.products(display_order);