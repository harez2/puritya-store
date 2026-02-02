import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductVariant {
  id?: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  sku: string | null;
  isNew?: boolean;
  isModified?: boolean;
}

interface VariantStockManagerProps {
  productId: string;
  sizes: string[];
  colors: string[];
  lowStockThreshold?: number;
}

export function VariantStockManager({
  productId,
  sizes,
  colors,
  lowStockThreshold = 5,
}: VariantStockManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Generate all possible size/color combinations
  const allCombinations = useMemo(() => {
    const combos: { size: string | null; color: string | null }[] = [];
    
    if (sizes.length === 0 && colors.length === 0) {
      // No variants, just a single product stock
      combos.push({ size: null, color: null });
    } else if (sizes.length === 0) {
      // Only colors
      colors.forEach(color => combos.push({ size: null, color }));
    } else if (colors.length === 0) {
      // Only sizes
      sizes.forEach(size => combos.push({ size, color: null }));
    } else {
      // Both sizes and colors
      sizes.forEach(size => {
        colors.forEach(color => {
          combos.push({ size, color });
        });
      });
    }
    
    return combos;
  }, [sizes, colors]);

  useEffect(() => {
    if (productId) {
      fetchVariants();
    }
  }, [productId]);

  async function fetchVariants() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('size')
        .order('color');

      if (error) throw error;
      setVariants(data || []);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast.error('Failed to load variant stock');
    } finally {
      setLoading(false);
    }
  }

  // Find existing variant for a combination
  const getVariantForCombo = (size: string | null, color: string | null) => {
    return variants.find(v => v.size === size && v.color === color);
  };

  // Get stock for a combination
  const getStockForCombo = (size: string | null, color: string | null): number => {
    const variant = getVariantForCombo(size, color);
    return variant?.stock_quantity ?? 0;
  };

  // Get SKU for a combination
  const getSkuForCombo = (size: string | null, color: string | null): string => {
    const variant = getVariantForCombo(size, color);
    return variant?.sku ?? '';
  };

  // Update stock for a combination
  const handleStockChange = (size: string | null, color: string | null, value: number) => {
    const existingVariant = getVariantForCombo(size, color);
    
    if (existingVariant) {
      setVariants(prev => prev.map(v => 
        v.size === size && v.color === color 
          ? { ...v, stock_quantity: value, isModified: true }
          : v
      ));
    } else {
      // Create new variant entry
      setVariants(prev => [...prev, {
        product_id: productId,
        size,
        color,
        stock_quantity: value,
        sku: null,
        isNew: true,
      }]);
    }
  };

  // Update SKU for a combination
  const handleSkuChange = (size: string | null, color: string | null, value: string) => {
    const existingVariant = getVariantForCombo(size, color);
    
    if (existingVariant) {
      setVariants(prev => prev.map(v => 
        v.size === size && v.color === color 
          ? { ...v, sku: value || null, isModified: true }
          : v
      ));
    } else {
      // Create new variant entry
      setVariants(prev => [...prev, {
        product_id: productId,
        size,
        color,
        stock_quantity: 0,
        sku: value || null,
        isNew: true,
      }]);
    }
  };

  // Generate variants for all combinations
  const handleGenerateAll = async () => {
    const newVariants: ProductVariant[] = [];
    
    allCombinations.forEach(combo => {
      if (!getVariantForCombo(combo.size, combo.color)) {
        newVariants.push({
          product_id: productId,
          size: combo.size,
          color: combo.color,
          stock_quantity: 0,
          sku: null,
          isNew: true,
        });
      }
    });
    
    if (newVariants.length > 0) {
      setVariants(prev => [...prev, ...newVariants]);
      toast.success(`Generated ${newVariants.length} new variant entries`);
    } else {
      toast.info('All variants already exist');
    }
  };

  // Save all changes
  const handleSaveAll = async () => {
    setSaving(true);
    
    try {
      // Get variants that need to be saved
      const toUpsert = variants.filter(v => v.isNew || v.isModified).map(v => ({
        id: v.id,
        product_id: v.product_id,
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity,
        sku: v.sku,
      }));

      if (toUpsert.length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }

      // Upsert variants
      const { error } = await supabase
        .from('product_variants')
        .upsert(toUpsert, { 
          onConflict: 'product_id,size,color',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast.success(`Saved ${toUpsert.length} variant${toUpsert.length > 1 ? 's' : ''}`);
      await fetchVariants();
    } catch (error: any) {
      console.error('Error saving variants:', error);
      toast.error(error.message || 'Failed to save variants');
    } finally {
      setSaving(false);
    }
  };

  // Delete a variant
  const handleDeleteVariant = async (size: string | null, color: string | null) => {
    const variant = getVariantForCombo(size, color);
    
    if (variant?.isNew) {
      // Just remove from local state
      setVariants(prev => prev.filter(v => !(v.size === size && v.color === color)));
      return;
    }

    if (!variant?.id) return;

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variant.id);

      if (error) throw error;
      
      setVariants(prev => prev.filter(v => v.id !== variant.id));
      toast.success('Variant deleted');
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      toast.error(error.message || 'Failed to delete variant');
    }
  };

  // Calculate totals
  const totalStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
  const lowStockCount = variants.filter(v => v.stock_quantity > 0 && v.stock_quantity <= lowStockThreshold).length;
  const outOfStockCount = variants.filter(v => v.stock_quantity === 0).length;
  const hasChanges = variants.some(v => v.isNew || v.isModified);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        Loading variant stock...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Total Stock: <strong>{totalStock}</strong>
          </span>
        </div>
        {lowStockCount > 0 && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {lowStockCount} low stock
          </Badge>
        )}
        {outOfStockCount > 0 && (
          <Badge variant="destructive">
            {outOfStockCount} out of stock
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateAll}
          disabled={allCombinations.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          Generate All Variants
        </Button>
        {hasChanges && (
          <Button
            type="button"
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={fetchVariants}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Variant Table */}
      {allCombinations.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {sizes.length > 0 && <TableHead className="w-24">Size</TableHead>}
                {colors.length > 0 && <TableHead className="w-32">Color</TableHead>}
                <TableHead className="w-32">Stock</TableHead>
                <TableHead className="w-40">SKU (Optional)</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCombinations.map((combo, index) => {
                const stock = getStockForCombo(combo.size, combo.color);
                const sku = getSkuForCombo(combo.size, combo.color);
                const variant = getVariantForCombo(combo.size, combo.color);
                const isLowStock = stock > 0 && stock <= lowStockThreshold;
                const isOutOfStock = stock === 0;

                return (
                  <TableRow 
                    key={`${combo.size}-${combo.color}-${index}`}
                    className={variant?.isNew || variant?.isModified ? 'bg-muted/50' : ''}
                  >
                    {sizes.length > 0 && (
                      <TableCell className="font-medium">{combo.size || '-'}</TableCell>
                    )}
                    {colors.length > 0 && (
                      <TableCell>{combo.color || '-'}</TableCell>
                    )}
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={stock}
                        onChange={(e) => handleStockChange(combo.size, combo.color, parseInt(e.target.value) || 0)}
                        className="w-24 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={sku}
                        onChange={(e) => handleSkuChange(combo.size, combo.color, e.target.value)}
                        className="w-32 h-8"
                        placeholder="SKU-001"
                      />
                    </TableCell>
                    <TableCell>
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                      ) : isLowStock ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteVariant(combo.size, combo.color)}
                              disabled={!variant}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete variant</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Add sizes or colors to manage variant stock</p>
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Stock is tracked per size/color combination. The total product stock is automatically calculated from all variants.
      </p>
    </div>
  );
}
