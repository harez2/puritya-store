-- Allow anonymous users to search orders by order_number or phone in shipping_address
-- This is for the public order tracking feature
CREATE POLICY "Anyone can view orders for tracking" 
ON public.orders 
FOR SELECT 
USING (true);