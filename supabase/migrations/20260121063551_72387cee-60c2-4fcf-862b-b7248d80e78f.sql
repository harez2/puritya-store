-- Add UTM tracking columns to orders table
ALTER TABLE public.orders
ADD COLUMN utm_source text,
ADD COLUMN utm_medium text,
ADD COLUMN utm_campaign text;