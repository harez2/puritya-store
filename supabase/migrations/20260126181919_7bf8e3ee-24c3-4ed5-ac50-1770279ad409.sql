-- Add targeting columns to popups table
ALTER TABLE public.popups 
ADD COLUMN target_pages TEXT[] DEFAULT '{}',
ADD COLUMN target_login_status TEXT DEFAULT 'any',
ADD COLUMN target_device_types TEXT[] DEFAULT '{}';