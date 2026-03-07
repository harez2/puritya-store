
CREATE OR REPLACE FUNCTION public.get_campaign_recipients(filters jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(phone text, customer_name text, city text, lifetime_value numeric, avg_order_value numeric, order_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    shipping_address->>'phone' as phone,
    COALESCE(shipping_address->>'full_name', shipping_address->>'fullName') as customer_name,
    COALESCE(shipping_address->>'city', shipping_address->>'state') as city,
    SUM(total) as lifetime_value,
    AVG(total) as avg_order_value,
    COUNT(*) as order_count
  FROM public.orders
  WHERE deleted_at IS NULL
    AND shipping_address->>'phone' IS NOT NULL
    AND shipping_address->>'phone' != ''
  GROUP BY shipping_address->>'phone', COALESCE(shipping_address->>'full_name', shipping_address->>'fullName'), COALESCE(shipping_address->>'city', shipping_address->>'state')
  HAVING
    (filters->>'min_ltv' IS NULL OR SUM(total) >= (filters->>'min_ltv')::numeric)
    AND (filters->>'max_ltv' IS NULL OR SUM(total) <= (filters->>'max_ltv')::numeric)
    AND (filters->>'min_aov' IS NULL OR AVG(total) >= (filters->>'min_aov')::numeric)
    AND (filters->>'max_aov' IS NULL OR AVG(total) <= (filters->>'max_aov')::numeric)
    AND (filters->>'city' IS NULL OR filters->>'city' = '' OR COALESCE(shipping_address->>'city', shipping_address->>'state') ILIKE '%' || (filters->>'city') || '%')
  ORDER BY SUM(total) DESC;
$$;
