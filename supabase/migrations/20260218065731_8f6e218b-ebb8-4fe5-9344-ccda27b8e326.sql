-- Allow admins to view all order items
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to update all order items
CREATE POLICY "Admins can update all order items"
ON public.order_items
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Allow admins to delete all order items
CREATE POLICY "Admins can delete all order items"
ON public.order_items
FOR DELETE
USING (public.is_admin(auth.uid()));