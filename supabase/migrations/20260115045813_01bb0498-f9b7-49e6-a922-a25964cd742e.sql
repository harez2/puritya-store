-- Fix checkout: allow authenticated users to insert/update/delete their own order_items
-- order_items currently only has a SELECT policy, so inserts fail with: new row violates row-level security policy

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- INSERT
  BEGIN
    CREATE POLICY "Users can insert their own order items"
    ON public.order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
      )
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- UPDATE
  BEGIN
    CREATE POLICY "Users can update their own order items"
    ON public.order_items
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
      )
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- DELETE
  BEGIN
    CREATE POLICY "Users can delete their own order items"
    ON public.order_items
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
      )
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;