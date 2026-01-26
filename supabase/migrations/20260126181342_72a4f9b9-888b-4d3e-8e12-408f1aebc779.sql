-- Add image column to popups table
ALTER TABLE public.popups ADD COLUMN image_url TEXT;

-- Create storage bucket for popup images
INSERT INTO storage.buckets (id, name, public)
VALUES ('popup-images', 'popup-images', true);

-- Storage policies for popup images
CREATE POLICY "Popup images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'popup-images');

CREATE POLICY "Admins can upload popup images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'popup-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update popup images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'popup-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete popup images"
ON storage.objects FOR DELETE
USING (bucket_id = 'popup-images' AND is_admin(auth.uid()));