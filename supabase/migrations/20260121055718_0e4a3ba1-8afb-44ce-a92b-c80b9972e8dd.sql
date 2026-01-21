-- Add order_source column to track where orders originate from
ALTER TABLE public.orders 
ADD COLUMN order_source text DEFAULT 'cart';

-- Add a comment explaining the column
COMMENT ON COLUMN public.orders.order_source IS 'Tracks order origin: cart (regular checkout) or quick_buy (quick checkout modal)';