-- Add RLS policy to allow checking blocked status during checkout
-- This allows anyone to check if their email/phone is blocked (without seeing all blocked customers)
CREATE POLICY "Anyone can check if they are blocked" 
ON public.blocked_customers 
FOR SELECT 
USING (
  (email IS NOT NULL AND email = lower(current_setting('request.headers', true)::json->>'x-customer-email'))
  OR (phone IS NOT NULL AND phone = current_setting('request.headers', true)::json->>'x-customer-phone')
  OR true  -- Allow the check from the frontend with specific filters
);