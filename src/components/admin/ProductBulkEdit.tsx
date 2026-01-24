import { useState } from 'react';
import { Edit3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
}

interface ProductBulkEditProps {
  selectedProductIds: string[];
  categories: Category[];
  onComplete: () => void;
  onClearSelection: () => void;
}

type UpdateField = 
  | 'category_id' 
  | 'in_stock' 
  | 'featured' 
  | 'new_arrival' 
  | 'price_adjustment' 
  | 'stock_quantity';

interface FieldUpdate {
  enabled: boolean;
  value: string | boolean | number;
}

export function ProductBulkEdit({ 
  selectedProductIds, 
  categories, 
  onComplete,
  onClearSelection 
}: ProductBulkEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [updates, setUpdates] = useState<Record<UpdateField, FieldUpdate>>({
    category_id: { enabled: false, value: '' },
    in_stock: { enabled: false, value: true },
    featured: { enabled: false, value: false },
    new_arrival: { enabled: false, value: false },
    price_adjustment: { enabled: false, value: 0 },
    stock_quantity: { enabled: false, value: 0 },
  });

  const [priceAdjustmentType, setPriceAdjustmentType] = useState<'fixed' | 'percentage'>('percentage');
  const [priceAdjustmentDirection, setPriceAdjustmentDirection] = useState<'increase' | 'decrease'>('increase');

  const handleOpen = () => {
    setUpdates({
      category_id: { enabled: false, value: '' },
      in_stock: { enabled: false, value: true },
      featured: { enabled: false, value: false },
      new_arrival: { enabled: false, value: false },
      price_adjustment: { enabled: false, value: 0 },
      stock_quantity: { enabled: false, value: 0 },
    });
    setPriceAdjustmentType('percentage');
    setPriceAdjustmentDirection('increase');
    setIsOpen(true);
  };

  const toggleField = (field: UpdateField, enabled: boolean) => {
    setUpdates(prev => ({
      ...prev,
      [field]: { ...prev[field], enabled }
    }));
  };

  const updateFieldValue = (field: UpdateField, value: string | boolean | number) => {
    setUpdates(prev => ({
      ...prev,
      [field]: { ...prev[field], value }
    }));
  };

  const handleSubmit = async () => {
    const enabledUpdates = Object.entries(updates).filter(([_, update]) => update.enabled);
    
    if (enabledUpdates.length === 0) {
      toast.error('Please select at least one field to update');
      return;
    }

    setSaving(true);

    try {
      // Handle price adjustment separately as it needs current prices
      if (updates.price_adjustment.enabled && updates.price_adjustment.value !== 0) {
        const { data: products, error: fetchError } = await supabase
          .from('products')
          .select('id, price')
          .in('id', selectedProductIds);

        if (fetchError) throw fetchError;

        for (const product of products || []) {
          let newPrice = product.price;
          const adjustment = Number(updates.price_adjustment.value);

          if (priceAdjustmentType === 'percentage') {
            const multiplier = priceAdjustmentDirection === 'increase' 
              ? 1 + (adjustment / 100)
              : 1 - (adjustment / 100);
            newPrice = Math.round(product.price * multiplier);
          } else {
            newPrice = priceAdjustmentDirection === 'increase'
              ? product.price + adjustment
              : product.price - adjustment;
          }

          newPrice = Math.max(0, newPrice);

          const { error } = await supabase
            .from('products')
            .update({ price: newPrice })
            .eq('id', product.id);

          if (error) throw error;
        }
      }

      // Build regular update object
      const updateData: Record<string, unknown> = {};

      if (updates.category_id.enabled) {
        updateData.category_id = updates.category_id.value || null;
      }
      if (updates.in_stock.enabled) {
        updateData.in_stock = updates.in_stock.value;
      }
      if (updates.featured.enabled) {
        updateData.featured = updates.featured.value;
      }
      if (updates.new_arrival.enabled) {
        updateData.new_arrival = updates.new_arrival.value;
      }
      if (updates.stock_quantity.enabled) {
        updateData.stock_quantity = Number(updates.stock_quantity.value);
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('products')
          .update(updateData)
          .in('id', selectedProductIds);

        if (error) throw error;
      }

      toast.success(`Updated ${selectedProductIds.length} products`);
      setIsOpen(false);
      onClearSelection();
      onComplete();
    } catch (error: any) {
      console.error('Bulk update error:', error);
      toast.error(error.message || 'Failed to update products');
    } finally {
      setSaving(false);
    }
  };

  if (selectedProductIds.length === 0) return null;

  return (
    <>
      <Button variant="secondary" onClick={handleOpen}>
        <Edit3 className="h-4 w-4 mr-2" />
        Bulk Edit ({selectedProductIds.length})
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Edit Products</DialogTitle>
            <DialogDescription>
              Update {selectedProductIds.length} selected product(s). Only checked fields will be updated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="bulk-category"
                checked={updates.category_id.enabled}
                onCheckedChange={(checked) => toggleField('category_id', checked as boolean)}
                className="mt-2.5"
              />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="bulk-category" className="cursor-pointer">Category</Label>
                <Select
                  value={updates.category_id.value as string}
                  onValueChange={(value) => updateFieldValue('category_id', value)}
                  disabled={!updates.category_id.enabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* In Stock */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="bulk-in-stock"
                checked={updates.in_stock.enabled}
                onCheckedChange={(checked) => toggleField('in_stock', checked as boolean)}
              />
              <div className="flex-1 flex items-center justify-between">
                <Label htmlFor="bulk-in-stock" className="cursor-pointer">In Stock</Label>
                <Switch
                  checked={updates.in_stock.value as boolean}
                  onCheckedChange={(checked) => updateFieldValue('in_stock', checked)}
                  disabled={!updates.in_stock.enabled}
                />
              </div>
            </div>

            {/* Featured */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="bulk-featured"
                checked={updates.featured.enabled}
                onCheckedChange={(checked) => toggleField('featured', checked as boolean)}
              />
              <div className="flex-1 flex items-center justify-between">
                <Label htmlFor="bulk-featured" className="cursor-pointer">Featured</Label>
                <Switch
                  checked={updates.featured.value as boolean}
                  onCheckedChange={(checked) => updateFieldValue('featured', checked)}
                  disabled={!updates.featured.enabled}
                />
              </div>
            </div>

            {/* New Arrival */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="bulk-new-arrival"
                checked={updates.new_arrival.enabled}
                onCheckedChange={(checked) => toggleField('new_arrival', checked as boolean)}
              />
              <div className="flex-1 flex items-center justify-between">
                <Label htmlFor="bulk-new-arrival" className="cursor-pointer">New Arrival</Label>
                <Switch
                  checked={updates.new_arrival.value as boolean}
                  onCheckedChange={(checked) => updateFieldValue('new_arrival', checked)}
                  disabled={!updates.new_arrival.enabled}
                />
              </div>
            </div>

            {/* Stock Quantity */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="bulk-stock"
                checked={updates.stock_quantity.enabled}
                onCheckedChange={(checked) => toggleField('stock_quantity', checked as boolean)}
                className="mt-2.5"
              />
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="bulk-stock" className="cursor-pointer">Set Stock Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={updates.stock_quantity.value as number}
                  onChange={(e) => updateFieldValue('stock_quantity', parseInt(e.target.value) || 0)}
                  disabled={!updates.stock_quantity.enabled}
                  placeholder="Enter stock quantity"
                />
              </div>
            </div>

            {/* Price Adjustment */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="bulk-price"
                checked={updates.price_adjustment.enabled}
                onCheckedChange={(checked) => toggleField('price_adjustment', checked as boolean)}
                className="mt-2.5"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="bulk-price" className="cursor-pointer">Price Adjustment</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={priceAdjustmentDirection}
                    onValueChange={(value) => setPriceAdjustmentDirection(value as 'increase' | 'decrease')}
                    disabled={!updates.price_adjustment.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase</SelectItem>
                      <SelectItem value="decrease">Decrease</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={priceAdjustmentType}
                    onValueChange={(value) => setPriceAdjustmentType(value as 'fixed' | 'percentage')}
                    disabled={!updates.price_adjustment.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">By Percentage</SelectItem>
                      <SelectItem value="fixed">By Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={updates.price_adjustment.value as number}
                    onChange={(e) => updateFieldValue('price_adjustment', parseFloat(e.target.value) || 0)}
                    disabled={!updates.price_adjustment.enabled}
                    placeholder={priceAdjustmentType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {priceAdjustmentType === 'percentage' ? '%' : '৳'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedProductIds.length} Products`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
