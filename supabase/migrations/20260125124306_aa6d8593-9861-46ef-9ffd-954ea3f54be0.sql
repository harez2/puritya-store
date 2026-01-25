-- Create payment status history table for audit trail
CREATE TABLE public.payment_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_status_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all payment history
CREATE POLICY "Admins can view payment history"
ON public.payment_status_history
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert payment history
CREATE POLICY "Admins can insert payment history"
ON public.payment_status_history
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_payment_status_history_order_id ON public.payment_status_history(order_id);
CREATE INDEX idx_payment_status_history_changed_at ON public.payment_status_history(changed_at DESC);