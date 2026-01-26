-- Create popups table for managing site popups
CREATE TABLE public.popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  cta_text TEXT,
  cta_link TEXT,
  cta_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  auto_close_seconds INTEGER DEFAULT 0,
  show_close_button BOOLEAN NOT NULL DEFAULT true,
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#000000',
  display_delay_seconds INTEGER DEFAULT 0,
  show_once_per_session BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active popups"
ON public.popups
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all popups"
ON public.popups
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert popups"
ON public.popups
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update popups"
ON public.popups
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete popups"
ON public.popups
FOR DELETE
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_popups_updated_at
BEFORE UPDATE ON public.popups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();