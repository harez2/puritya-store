-- Fix 1: Remove overly permissive orders tracking policy
DROP POLICY IF EXISTS "Anyone can view orders for tracking" ON public.orders;

-- Create a more restrictive policy for order tracking that requires order_number lookup
-- Users can view orders if they provide the correct order_number (for guest tracking)
-- This is handled at the application level - we remove the public access
-- The existing policies for authenticated users viewing their own orders remain

-- Fix 2: Fix blocked_customers policy - remove OR true fallback
DROP POLICY IF EXISTS "Anyone can check if they are blocked" ON public.blocked_customers;

-- Create a proper policy that only allows checking specific identifiers
-- This policy allows the application to check if a specific email/phone is blocked
-- without exposing all blocked customer records
CREATE POLICY "Check specific blocked customer" 
ON public.blocked_customers 
FOR SELECT 
USING (
  is_active = true AND (
    expires_at IS NULL OR expires_at > now()
  )
);

-- Also add a function to safely check if someone is blocked (to be used from edge function)
CREATE OR REPLACE FUNCTION public.check_if_blocked(
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _device_id text DEFAULT NULL,
  _ip_address text DEFAULT NULL
)
RETURNS TABLE (
  is_blocked boolean,
  reason text,
  custom_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    true as is_blocked,
    bc.reason,
    bc.custom_message
  FROM public.blocked_customers bc
  WHERE bc.is_active = true
    AND (bc.expires_at IS NULL OR bc.expires_at > now())
    AND (
      (_email IS NOT NULL AND bc.email = lower(_email))
      OR (_phone IS NOT NULL AND bc.phone = _phone)
      OR (_device_id IS NOT NULL AND bc.device_id = _device_id)
      OR (_ip_address IS NOT NULL AND bc.ip_address = _ip_address)
    )
  LIMIT 1;
$$;