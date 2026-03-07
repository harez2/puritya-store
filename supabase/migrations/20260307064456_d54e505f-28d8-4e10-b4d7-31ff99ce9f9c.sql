
-- sms_campaigns table
CREATE TABLE public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  segment_filters jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all on sms_campaigns" ON public.sms_campaigns FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- sms_campaign_recipients table
CREATE TABLE public.sms_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  phone text NOT NULL,
  customer_name text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all on sms_campaign_recipients" ON public.sms_campaign_recipients FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Function to get campaign recipients based on filters
CREATE OR REPLACE FUNCTION public.get_campaign_recipients(filters jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(phone text, customer_name text, city text, lifetime_value numeric, avg_order_value numeric, order_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    shipping_address->>'phone' as phone,
    shipping_address->>'fullName' as customer_name,
    shipping_address->>'city' as city,
    SUM(total) as lifetime_value,
    AVG(total) as avg_order_value,
    COUNT(*) as order_count
  FROM public.orders
  WHERE deleted_at IS NULL
    AND shipping_address->>'phone' IS NOT NULL
    AND shipping_address->>'phone' != ''
  GROUP BY shipping_address->>'phone', shipping_address->>'fullName', shipping_address->>'city'
  HAVING
    (filters->>'min_ltv' IS NULL OR SUM(total) >= (filters->>'min_ltv')::numeric)
    AND (filters->>'max_ltv' IS NULL OR SUM(total) <= (filters->>'max_ltv')::numeric)
    AND (filters->>'min_aov' IS NULL OR AVG(total) >= (filters->>'min_aov')::numeric)
    AND (filters->>'max_aov' IS NULL OR AVG(total) <= (filters->>'max_aov')::numeric)
    AND (filters->>'city' IS NULL OR filters->>'city' = '' OR shipping_address->>'city' ILIKE '%' || (filters->>'city') || '%')
  ORDER BY SUM(total) DESC;
$$;
