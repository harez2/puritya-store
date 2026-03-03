
-- Drop the existing RESTRICTIVE insert policies
DROP POLICY IF EXISTS "Anyone can create guest orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

-- Recreate as PERMISSIVE (default) so at least one can grant access
CREATE POLICY "Anyone can create guest orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));
