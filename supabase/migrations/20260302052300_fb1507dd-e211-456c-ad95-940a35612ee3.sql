
-- Allow admins to delete order status history (needed for permanent order deletion)
CREATE POLICY "Admins can delete order status history"
  ON public.order_status_history
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to delete payment status history (needed for permanent order deletion)
CREATE POLICY "Admins can delete payment status history"
  ON public.payment_status_history
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
