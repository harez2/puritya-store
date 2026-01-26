-- Create landing page analytics table
CREATE TABLE public.landing_page_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'checkout', 'purchase')),
  session_id TEXT,
  user_id UUID,
  device_type TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  section_id TEXT,
  product_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_page_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (for tracking)
CREATE POLICY "Anyone can insert landing page analytics"
ON public.landing_page_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view landing page analytics"
ON public.landing_page_analytics
FOR SELECT
USING (is_admin(auth.uid()));

-- Create indexes for efficient querying
CREATE INDEX idx_landing_page_analytics_page_id ON public.landing_page_analytics(landing_page_id);
CREATE INDEX idx_landing_page_analytics_event_type ON public.landing_page_analytics(event_type);
CREATE INDEX idx_landing_page_analytics_created_at ON public.landing_page_analytics(created_at);