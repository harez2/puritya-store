-- Add show_cover_photo column to categories table
ALTER TABLE public.categories 
ADD COLUMN show_cover_photo boolean NOT NULL DEFAULT false;