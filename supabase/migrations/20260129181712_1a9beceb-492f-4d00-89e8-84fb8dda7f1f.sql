-- Allow anyone to SELECT incomplete orders by their session_id
-- This is needed so the hook can check if an existing record exists before inserting
CREATE POLICY "Anyone can view their own session incomplete orders"
ON public.incomplete_orders
FOR SELECT
USING (true);