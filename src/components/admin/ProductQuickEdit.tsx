import { useState } from 'react';
import { Zap } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  in_stock: boolean | null;
  featured: boolean | null;
  new_arrival: boolean | null;
  stock_quantity: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface ProductQuickEditProps {
  product: Product | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ProductQuickEdit({
  product,
  categories,
  open,
  onOpenChange,
  onSave,
}: ProductQuickEditProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    compare_at_price: 0,
    stock_quantity: 0,
    in_stock: true,
    featured: false,
    new_arrival: false,
    category_id: '',
  });

  // Update form when product changes
  useState(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price,
        compare_at_price: product.compare_at_price || 0,
        stock_quantity: product.stock_quantity,
        in_stock: product.in_stock ?? true,
        featured: product.featured ?? false,
        new_arrival: product.new_arrival ?? false,
        category_id: product.category_id || '',
      });
    }
  });

  // Reset form when sheet opens with new product
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && product) {
      setFormData({
        name: product.name,
        price: product.price,
        compare_at_price: product.compare_at_price || 0,
        stock_quantity: product.stock_quantity,
        in_stock: product.in_stock ?? true,
        featured: product.featured ?? false,
        new_arrival: product.new_arrival ?? false,
        category_id: product.category_id || '',
      });
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    if (!product) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          price: formData.price,
          compare_at_price: formData.compare_at_price || null,
          stock_quantity: formData.stock_quantity,
          in_stock: formData.in_stock,
          featured: formData.featured,
          new_arrival: formData.new_arrival,
          category_id: formData.category_id || null,
        })
        .eq('id', product.id);

      if (error) throw error;
      
      toast.success('Product updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Edit
          </SheetTitle>
          <SheetDescription>
            Quickly update essential product details
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="quick-name">Product Name</Label>
            <Input
              id="quick-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quick-price">Price</Label>
              <Input
                id="quick-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-compare">Compare Price</Label>
              <Input
                id="quick-compare"
                type="number"
                value={formData.compare_at_price}
                onChange={(e) => setFormData({ ...formData, compare_at_price: Number(e.target.value) })}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-stock">Stock Quantity</Label>
            <Input
              id="quick-stock"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger id="quick-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-in-stock" className="cursor-pointer">In Stock</Label>
              <Switch
                id="quick-in-stock"
                checked={formData.in_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-featured" className="cursor-pointer">Featured</Label>
              <Switch
                id="quick-featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-new" className="cursor-pointer">New Arrival</Label>
              <Switch
                id="quick-new"
                checked={formData.new_arrival}
                onCheckedChange={(checked) => setFormData({ ...formData, new_arrival: checked })}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
