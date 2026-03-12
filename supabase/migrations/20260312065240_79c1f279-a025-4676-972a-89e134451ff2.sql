
-- Function to restore stock when order is cancelled or returned
CREATE OR REPLACE FUNCTION public.restore_stock_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run when status changes TO cancelled or returned FROM a non-cancelled/returned status
  IF (NEW.status IN ('cancelled', 'returned')) 
     AND (OLD.status NOT IN ('cancelled', 'returned')) THEN
    -- Restore stock for each order item
    -- Restore variant stock
    UPDATE public.product_variants pv
    SET stock_quantity = pv.stock_quantity + oi.quantity,
        updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = pv.product_id
      AND (pv.size IS NOT DISTINCT FROM oi.size)
      AND (pv.color IS NOT DISTINCT FROM oi.color)
      AND (oi.size IS NOT NULL OR oi.color IS NOT NULL);

    -- Restore parent product stock
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + oi.quantity,
        in_stock = true,
        updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id;
  END IF;

  -- If status changes FROM cancelled/returned TO something else, deduct stock again
  IF (OLD.status IN ('cancelled', 'returned'))
     AND (NEW.status NOT IN ('cancelled', 'returned')) THEN
    -- Deduct variant stock
    UPDATE public.product_variants pv
    SET stock_quantity = GREATEST(pv.stock_quantity - oi.quantity, 0),
        updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = pv.product_id
      AND (pv.size IS NOT DISTINCT FROM oi.size)
      AND (pv.color IS NOT DISTINCT FROM oi.color)
      AND (oi.size IS NOT NULL OR oi.color IS NOT NULL);

    -- Deduct parent product stock
    UPDATE public.products p
    SET stock_quantity = GREATEST(p.stock_quantity - oi.quantity, 0),
        in_stock = CASE WHEN GREATEST(p.stock_quantity - oi.quantity, 0) > 0 THEN true ELSE false END,
        updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.product_id = p.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER restore_stock_on_order_status_change
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_order_cancel();
