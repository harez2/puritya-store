
-- 1. Fix product deletion: make order_items.product_id nullable + ON DELETE SET NULL
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.order_items DROP CONSTRAINT order_items_product_id_fkey;
ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. Fix incomplete_orders.converted_order_id FK to ON DELETE SET NULL
ALTER TABLE public.incomplete_orders DROP CONSTRAINT incomplete_orders_converted_order_id_fkey;
ALTER TABLE public.incomplete_orders 
  ADD CONSTRAINT incomplete_orders_converted_order_id_fkey 
  FOREIGN KEY (converted_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- 3. Add deleted_at column to orders for soft-delete/trash
ALTER TABLE public.orders ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- 4. Add DELETE RLS policy on orders for admins
CREATE POLICY "Admins can delete orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
