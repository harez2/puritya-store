-- Create incomplete_orders table
CREATE TABLE public.incomplete_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  shipping_location TEXT,
  payment_method TEXT,
  notes TEXT,
  cart_items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'checkout',
  status TEXT DEFAULT 'pending',
  converted_order_id UUID REFERENCES public.orders(id),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incomplete_orders ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_incomplete_orders_session ON public.incomplete_orders(session_id);
CREATE INDEX idx_incomplete_orders_status ON public.incomplete_orders(status);
CREATE INDEX idx_incomplete_orders_phone ON public.incomplete_orders(phone);
CREATE INDEX idx_incomplete_orders_created ON public.incomplete_orders(created_at DESC);

-- RLS Policies
CREATE POLICY "Admins can manage incomplete orders"
  ON public.incomplete_orders FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can create incomplete orders"
  ON public.incomplete_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update incomplete orders"
  ON public.incomplete_orders FOR UPDATE
  USING (true);