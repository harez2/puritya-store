-- Create pages table for dynamic page content
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  meta_description TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Anyone can view published pages
CREATE POLICY "Anyone can view published pages"
ON public.pages
FOR SELECT
USING (published = true);

-- Admins can view all pages
CREATE POLICY "Admins can view all pages"
ON public.pages
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert pages
CREATE POLICY "Admins can insert pages"
ON public.pages
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can update pages
CREATE POLICY "Admins can update pages"
ON public.pages
FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete pages
CREATE POLICY "Admins can delete pages"
ON public.pages
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pages with content from existing static pages
INSERT INTO public.pages (slug, title, content, meta_description, published) VALUES
('contact', 'Contact Us', '<p>Get in touch with us. We''re here to help with any questions about your order, products, or general inquiries.</p>', 'Contact us for any questions about your orders or products.', true),
('shipping', 'Shipping Information', '<h2>Delivery Times</h2><p>Orders within Dhaka typically arrive within 1-2 business days. For areas outside Dhaka, delivery takes 3-5 business days.</p><h2>Shipping Costs</h2><ul><li><strong>Inside Dhaka:</strong> ৳60</li><li><strong>Outside Dhaka:</strong> ৳120</li></ul>', 'Learn about our shipping policies and delivery times across Bangladesh.', true),
('returns', 'Returns & Exchanges', '<h2>7-Day Return Policy</h2><p>Return or exchange items within 7 days of delivery.</p><h2>Eligibility</h2><p>Items must be unworn, unwashed, and have all original tags attached.</p>', 'Easy returns within 7 days of delivery. Learn about our return policy.', true),
('size-guide', 'Size Guide', '<h2>How to Measure</h2><p>Measure around the fullest part of your bust, natural waistline, and hips.</p><p>Check our detailed size charts for tops, dresses, and bottoms.</p>', 'Find your perfect fit with our comprehensive size guide.', true),
('faqs', 'Frequently Asked Questions', '<h2>Orders & Shipping</h2><p>Find answers to common questions about ordering, shipping, and delivery.</p><h2>Returns</h2><p>Learn about our 7-day return policy and how to initiate returns.</p>', 'Frequently asked questions about shopping with us.', true),
('about', 'Our Story', '<p>Welcome to our store, where we believe that fashion is more than just clothing—it''s a form of self-expression that empowers you to feel confident and beautiful every day.</p>', 'Learn about our journey and what makes us passionate about fashion.', true),
('sustainability', 'Sustainability', '<h2>Our Commitment</h2><p>Fashion that respects both people and planet. We partner with suppliers who share our values and prioritize ethical practices.</p>', 'Learn about our commitment to sustainability and ethical fashion.', true),
('privacy', 'Privacy Policy', '<h2>Information We Collect</h2><p>We collect personal information when you create an account, place an order, or subscribe to our newsletter.</p><h2>How We Use It</h2><p>We use your information to process orders, send updates, and improve our services.</p>', 'Our privacy policy explains how we collect and protect your information.', true),
('terms', 'Terms of Service', '<h2>Acceptance of Terms</h2><p>By using our website, you agree to be bound by these Terms of Service.</p><h2>Use of Website</h2><p>You agree to use our website only for lawful purposes.</p>', 'Read our terms and conditions for using our website and services.', true);