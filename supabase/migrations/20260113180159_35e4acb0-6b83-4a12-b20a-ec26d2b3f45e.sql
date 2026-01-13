-- Add stock quantity and low stock threshold columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

-- Create an index for efficient low stock queries
CREATE INDEX IF NOT EXISTS idx_products_low_stock 
ON public.products (stock_quantity, low_stock_threshold) 
WHERE in_stock = true;