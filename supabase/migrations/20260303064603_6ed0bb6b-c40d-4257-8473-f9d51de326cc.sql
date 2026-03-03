
-- Fix orders INSERT policy: must be PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create guest orders" ON public.orders;
CREATE POLICY "Anyone can create guest orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));

-- Fix order_items INSERT policy: must be PERMISSIVE
DROP POLICY IF EXISTS "Anyone can insert order items for guest orders" ON public.order_items;
CREATE POLICY "Anyone can insert order items for guest orders"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM orders
  WHERE orders.id = order_items.order_id
  AND (orders.user_id IS NULL OR orders.user_id = auth.uid())
));

-- Fix orders SELECT for guests to see their just-created order
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins and owners can view orders"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (is_admin(auth.uid()) OR auth.uid() = user_id OR user_id IS NULL);
