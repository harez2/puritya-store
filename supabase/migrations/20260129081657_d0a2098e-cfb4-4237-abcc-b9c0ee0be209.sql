-- Create blocked_customers table to track blocked customers by various identifiers
CREATE TABLE public.blocked_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  device_id TEXT,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookup
CREATE INDEX idx_blocked_customers_email ON public.blocked_customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_blocked_customers_phone ON public.blocked_customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_blocked_customers_device_id ON public.blocked_customers(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX idx_blocked_customers_active ON public.blocked_customers(is_active);

-- Enable RLS
ALTER TABLE public.blocked_customers ENABLE ROW LEVEL SECURITY;

-- Only admins can view blocked customers
CREATE POLICY "Admins can view blocked customers"
ON public.blocked_customers
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can insert blocked customers
CREATE POLICY "Admins can insert blocked customers"
ON public.blocked_customers
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update blocked customers
CREATE POLICY "Admins can update blocked customers"
ON public.blocked_customers
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete blocked customers
CREATE POLICY "Admins can delete blocked customers"
ON public.blocked_customers
FOR DELETE
USING (is_admin(auth.uid()));