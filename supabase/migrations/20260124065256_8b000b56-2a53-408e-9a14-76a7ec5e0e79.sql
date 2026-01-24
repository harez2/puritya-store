-- Add meta_description column to products table
ALTER TABLE public.products
ADD COLUMN meta_description text;

-- Add meta_description column to blogs table
ALTER TABLE public.blogs
ADD COLUMN meta_description text;

-- Add comments for documentation
COMMENT ON COLUMN public.products.meta_description IS 'SEO meta description for product pages';
COMMENT ON COLUMN public.blogs.meta_description IS 'SEO meta description for blog posts';