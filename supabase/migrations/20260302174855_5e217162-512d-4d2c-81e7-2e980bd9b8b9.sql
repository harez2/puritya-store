
-- Add courier tracking columns to orders table
ALTER TABLE public.orders
ADD COLUMN courier_name text,
ADD COLUMN courier_consignment_id text,
ADD COLUMN courier_tracking_code text,
ADD COLUMN courier_tracking_url text,
ADD COLUMN courier_status text;
