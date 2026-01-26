-- Allow users to update their own orders (for cancellation)
CREATE POLICY "Users can cancel their own pending orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Allow users to insert their own order status history
CREATE POLICY "Users can insert their own order status history"
ON public.order_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_status_history.order_id
    AND orders.user_id = auth.uid()
  )
);