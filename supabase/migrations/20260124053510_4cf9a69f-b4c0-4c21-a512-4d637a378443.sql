-- Create a table to track visitor sessions with UTM data
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  landing_page TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries on UTM data
CREATE INDEX idx_visitor_sessions_utm_source ON public.visitor_sessions(utm_source);
CREATE INDEX idx_visitor_sessions_created_at ON public.visitor_sessions(created_at);
CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions(session_id);

-- Enable RLS
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking anonymous visitors)
CREATE POLICY "Anyone can insert visitor sessions"
ON public.visitor_sessions
FOR INSERT
WITH CHECK (true);

-- Only admins can view visitor sessions
CREATE POLICY "Admins can view visitor sessions"
ON public.visitor_sessions
FOR SELECT
USING (is_admin(auth.uid()));