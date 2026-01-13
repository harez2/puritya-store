import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

export function ProductImageUpload({ images, onImagesChange }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max size is 5MB`);
          continue;
        }

        const url = await uploadImage(file);
        newImages.push(url);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast.success(`${newImages.length} image(s) uploaded successfully`);
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (index: number) => {
    const imageUrl = images[index];
    
    // Extract the file path from the URL
    try {
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/product-images\/(.+)$/);
      
      if (pathMatch) {
        const filePath = pathMatch[1];
        await supabase.storage
          .from('product-images')
          .remove([filePath]);
      }
    } catch (error) {
      console.error('Error deleting image from storage:', error);
    }

    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Images
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          Max 5MB per image
        </span>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-4 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No images uploaded yet. Click the button above to add product images.
          </p>
        </div>
      )}
    </div>
  );
}
