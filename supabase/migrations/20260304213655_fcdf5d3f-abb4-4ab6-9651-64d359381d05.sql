
-- Function to deduct stock when order items are inserted
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try to deduct from matching variant first
  IF NEW.size IS NOT NULL OR NEW.color IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0),
        updated_at = now()
    WHERE product_id = NEW.product_id
      AND (size IS NOT DISTINCT FROM NEW.size)
      AND (color IS NOT DISTINCT FROM NEW.color);
  END IF;

  -- Always deduct from parent product stock
  UPDATE public.products
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0),
      in_stock = CASE WHEN GREATEST(stock_quantity - NEW.quantity, 0) > 0 THEN true ELSE false END,
      updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

-- Function to restore stock when order items are deleted
CREATE OR REPLACE FUNCTION public.restore_stock_on_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Restore variant stock
  IF OLD.size IS NOT NULL OR OLD.color IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity + OLD.quantity,
        updated_at = now()
    WHERE product_id = OLD.product_id
      AND (size IS NOT DISTINCT FROM OLD.size)
      AND (color IS NOT DISTINCT FROM OLD.color);
  END IF;

  -- Restore parent product stock
  UPDATE public.products
  SET stock_quantity = stock_quantity + OLD.quantity,
      in_stock = true,
      updated_at = now()
  WHERE id = OLD.product_id;

  RETURN OLD;
END;
$$;

-- Trigger: deduct stock on order item insert
CREATE TRIGGER deduct_stock_on_order_item_insert
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order();

-- Trigger: restore stock on order item delete
CREATE TRIGGER restore_stock_on_order_item_delete
AFTER DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_order_delete();
