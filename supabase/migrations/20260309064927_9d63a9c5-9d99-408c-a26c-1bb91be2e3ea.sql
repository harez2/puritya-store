CREATE OR REPLACE FUNCTION public.notify_admin_on_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://kmbcslfbhpcmxvdsokja.supabase.co/functions/v1/notify-admin-order',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYmNzbGZiaHBjbXh2ZHNva2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjkwNzIsImV4cCI6MjA4Mzg0NTA3Mn0.73TCw_MyPZKJslQEVf_Kr5GM2y7B59-VO7npF_U_uMs'
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_admin_on_new_order error: %', SQLERRM;
  RETURN NEW;
END;
$function$;