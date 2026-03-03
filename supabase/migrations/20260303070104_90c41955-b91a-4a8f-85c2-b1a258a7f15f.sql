-- Add deleted_at column for soft-delete trash system
ALTER TABLE public.products ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for faster filtering
CREATE INDEX idx_products_deleted_at ON public.products (deleted_at);
