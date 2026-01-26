-- Create landing pages table for single-page landing page builder
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  -- Sections stored as JSONB for flexible content
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Page settings
  header_visible BOOLEAN NOT NULL DEFAULT true,
  footer_visible BOOLEAN NOT NULL DEFAULT true,
  custom_css TEXT,
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Admins can manage landing pages
CREATE POLICY "Admins can insert landing pages"
ON public.landing_pages
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update landing pages"
ON public.landing_pages
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete landing pages"
ON public.landing_pages
FOR DELETE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all landing pages"
ON public.landing_pages
FOR SELECT
USING (is_admin(auth.uid()));

-- Anyone can view published landing pages
CREATE POLICY "Anyone can view published landing pages"
ON public.landing_pages
FOR SELECT
USING (status = 'published');

-- Create indexes
CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX idx_landing_pages_status ON public.landing_pages(status);

-- Add trigger for updated_at
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();