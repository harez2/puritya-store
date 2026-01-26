import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PopupImageUploadProps {
  image: string | null;
  onImageChange: (image: string | null) => void;
}

export function PopupImageUpload({ image, onImageChange }: PopupImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `popups/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('popup-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('popup-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Max size is 5MB');
      return;
    }

    setUploading(true);

    try {
      const url = await uploadImage(file);
      onImageChange(url);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async () => {
    if (!image) return;
    
    try {
      const url = new URL(image);
      const pathMatch = url.pathname.match(/\/popup-images\/(.+)$/);
      
      if (pathMatch) {
        const filePath = pathMatch[1];
        await supabase.storage
          .from('popup-images')
          .remove([filePath]);
      }
    } catch (error) {
      console.error('Error deleting image from storage:', error);
    }

    onImageChange(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {image ? (
        <div className="relative group">
          <div className="aspect-[16/9] rounded-lg overflow-hidden bg-muted max-h-40">
            <img
              src={image}
              alt="Popup banner"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Replace
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeImage}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-[16/9] max-h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-muted-foreground/50 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              <span className="text-xs text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">Click to upload banner</span>
              <span className="text-xs text-muted-foreground/70">Max 5MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
