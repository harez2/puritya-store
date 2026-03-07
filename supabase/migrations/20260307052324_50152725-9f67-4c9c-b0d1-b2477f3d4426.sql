
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _supabase_url text;
  _service_role_key text;
BEGIN
  -- Try vault first
  SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- If vault secrets are null, skip notification silently
  IF _supabase_url IS NULL OR _service_role_key IS NULL THEN
    RAISE LOG 'notify_admin_on_new_order: Missing vault secrets, skipping notification';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-admin-order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_admin_on_new_order error: %', SQLERRM;
  RETURN NEW;
END;
$function$;
