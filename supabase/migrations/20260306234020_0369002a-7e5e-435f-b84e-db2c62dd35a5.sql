
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-admin-order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_order_notify_admin ON public.orders;
CREATE TRIGGER on_new_order_notify_admin
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_new_order();
