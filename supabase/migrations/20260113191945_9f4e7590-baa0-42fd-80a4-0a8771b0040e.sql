-- Create site_settings table to store all customizable settings
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read site settings (needed for frontend to display)
CREATE POLICY "Site settings are viewable by everyone" 
ON public.site_settings 
FOR SELECT 
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert site settings" 
ON public.site_settings 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update site settings" 
ON public.site_settings 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete site settings" 
ON public.site_settings 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.site_settings (key, value, category) VALUES
-- Branding
('store_name', '"Puritya"', 'branding'),
('store_tagline', '"Curated feminine fashion imported from around the world"', 'branding'),
('logo_url', '""', 'branding'),
('favicon_url', '""', 'branding'),

-- Theme Colors (HSL values as strings)
('primary_color', '{"h": 12, "s": 45, "l": 55}'::jsonb, 'theme'),
('secondary_color', '{"h": 35, "s": 35, "l": 92}'::jsonb, 'theme'),
('accent_color', '{"h": 350, "s": 35, "l": 90}'::jsonb, 'theme'),
('background_color', '{"h": 30, "s": 30, "l": 98}'::jsonb, 'theme'),

-- Hero Section
('hero_title', '"Elevate Your Feminine Style"', 'homepage'),
('hero_subtitle', '"Discover curated fashion pieces imported from around the world. Timeless elegance for the modern woman."', 'homepage'),
('hero_badge', '"New Collection"', 'homepage'),
('hero_cta_text', '"Shop Now"', 'homepage'),
('hero_image_url', '""', 'homepage'),

-- Announcement Bar
('announcement_text', '"Free shipping on orders over ₦50,000 | Use code PURITYA10 for 10% off"', 'homepage'),
('announcement_enabled', 'true', 'homepage'),

-- CTA Banner
('cta_title', '"Join the Puritya Family"', 'homepage'),
('cta_subtitle', '"Subscribe for exclusive access to new arrivals, special offers, and styling tips."', 'homepage'),
('cta_button_text', '"Create Account"', 'homepage'),

-- Footer
('footer_description', '"Curated feminine fashion imported from around the world. Elevate your style with our carefully selected pieces."', 'footer'),
('copyright_text', '"© 2025 Puritya. All rights reserved."', 'footer'),
('footer_tagline', '"puritya.store • Shipping across Bangladesh 🇧🇩"', 'footer'),

-- Social Links
('social_instagram', '""', 'social'),
('social_facebook', '""', 'social'),
('social_twitter', '""', 'social'),

-- Features Section
('features', '[
  {"icon": "truck", "title": "Free Delivery", "desc": "On orders over ৳5,000"},
  {"icon": "refresh-cw", "title": "Easy Returns", "desc": "7-day return policy"},
  {"icon": "shield", "title": "Secure Payment", "desc": "bKash, Nagad & Cards accepted"}
]'::jsonb, 'homepage');