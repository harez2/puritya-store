-- Create popup analytics table to track views, clicks, and conversions
CREATE TABLE public.popup_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  popup_id UUID NOT NULL REFERENCES public.popups(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'close')),
  session_id TEXT,
  user_id UUID,
  device_type TEXT,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.popup_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics events (for tracking)
CREATE POLICY "Anyone can insert popup analytics"
ON public.popup_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view popup analytics"
ON public.popup_analytics
FOR SELECT
USING (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_popup_analytics_popup_id ON public.popup_analytics(popup_id);
CREATE INDEX idx_popup_analytics_created_at ON public.popup_analytics(created_at);