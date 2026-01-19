-- Create blog categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to blogs table
ALTER TABLE public.blogs ADD COLUMN category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL;

-- Enable RLS on blog_categories
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_categories
CREATE POLICY "Anyone can view blog categories" 
ON public.blog_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert blog categories" 
ON public.blog_categories 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update blog categories" 
ON public.blog_categories 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete blog categories" 
ON public.blog_categories 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_blogs_category_id ON public.blogs(category_id);