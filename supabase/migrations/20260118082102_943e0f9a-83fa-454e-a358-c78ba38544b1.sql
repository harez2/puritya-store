-- Create blogs table
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Public can view published blogs
CREATE POLICY "Anyone can view published blogs"
ON public.blogs
FOR SELECT
USING (published = true);

-- Admins can view all blogs
CREATE POLICY "Admins can view all blogs"
ON public.blogs
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can insert blogs
CREATE POLICY "Admins can insert blogs"
ON public.blogs
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can update blogs
CREATE POLICY "Admins can update blogs"
ON public.blogs
FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete blogs
CREATE POLICY "Admins can delete blogs"
ON public.blogs
FOR DELETE
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();