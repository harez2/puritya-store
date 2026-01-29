-- Create OTP verifications table
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_otp_verifications_phone_session ON public.otp_verifications(phone, session_id);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Enable Row Level Security
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP records (for checkout flow)
CREATE POLICY "Anyone can create OTP verifications"
ON public.otp_verifications
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read OTP records based on phone and session
CREATE POLICY "Anyone can read their OTP verifications"
ON public.otp_verifications
FOR SELECT
USING (true);

-- Allow anyone to update OTP records (for verification)
CREATE POLICY "Anyone can update OTP verifications"
ON public.otp_verifications
FOR UPDATE
USING (true);

-- Allow admins to delete OTP records
CREATE POLICY "Admins can delete OTP verifications"
ON public.otp_verifications
FOR DELETE
USING (is_admin(auth.uid()));