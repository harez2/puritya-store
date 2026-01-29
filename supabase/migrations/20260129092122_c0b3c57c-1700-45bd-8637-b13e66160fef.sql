-- Add expiry and custom message columns to blocked_customers
ALTER TABLE public.blocked_customers 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN custom_message TEXT DEFAULT NULL,
ADD COLUMN ip_address TEXT DEFAULT NULL;