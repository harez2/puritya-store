
-- Create product_variants table for size/color level stock tracking
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT,
  color TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  price_adjustment NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, size, color)
);

-- Create index for faster lookups
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants(sku) WHERE sku IS NOT NULL;

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Variants are viewable by everyone"
ON public.product_variants FOR SELECT
USING (true);

CREATE POLICY "Admins can insert variants"
ON public.product_variants FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update variants"
ON public.product_variants FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete variants"
ON public.product_variants FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate total stock from variants
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent product's stock_quantity to sum of all variants
  UPDATE public.products
  SET stock_quantity = COALESCE((
    SELECT SUM(stock_quantity) FROM public.product_variants WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ), 0),
  in_stock = COALESCE((
    SELECT SUM(stock_quantity) > 0 FROM public.product_variants WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ), false)
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to sync stock when variants change
CREATE TRIGGER sync_product_stock_on_variant_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_variants();
