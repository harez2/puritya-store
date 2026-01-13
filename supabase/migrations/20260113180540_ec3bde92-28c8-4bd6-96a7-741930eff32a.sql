-- Create function to automatically update in_stock based on stock_quantity
CREATE OR REPLACE FUNCTION public.update_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If stock_quantity reaches 0, mark as out of stock
  IF NEW.stock_quantity <= 0 THEN
    NEW.in_stock = false;
  -- If stock was 0 and now has quantity, mark as in stock
  ELSIF OLD.stock_quantity <= 0 AND NEW.stock_quantity > 0 THEN
    NEW.in_stock = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to run before update on products
CREATE TRIGGER trigger_update_product_stock_status
BEFORE UPDATE ON public.products
FOR EACH ROW
WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
EXECUTE FUNCTION public.update_product_stock_status();

-- Also handle inserts
CREATE TRIGGER trigger_insert_product_stock_status
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock_status();