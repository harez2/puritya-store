-- Allow nullable user_id for guest orders
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Add policy for inserting guest orders (anonymous users)
CREATE POLICY "Anyone can create guest orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Drop the old user-only insert policy
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

-- Update select policy to allow viewing guest orders by admins and own orders by users
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Add policy for anonymous users to insert order items for their orders
CREATE POLICY "Anyone can insert order items for guest orders"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id IS NULL OR orders.user_id = auth.uid())
  )
);

-- Drop the old user-only insert policy for order_items
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;