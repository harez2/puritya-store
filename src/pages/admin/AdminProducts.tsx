import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search, X, Filter, RotateCcw, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProductBulkActions } from '@/components/admin/ProductBulkActions';
import { ProductBulkEdit } from '@/components/admin/ProductBulkEdit';
import { ProductQuickEdit } from '@/components/admin/ProductQuickEdit';
import { SortableProductRow } from '@/components/admin/SortableProductRow';

interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  meta_description: string | null;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  sizes: string[] | null;
  colors: string[] | null;
  in_stock: boolean | null;
  featured: boolean | null;
  new_arrival: boolean | null;
  category_id: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');
  const [newArrivalFilter, setNewArrivalFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.slug.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'uncategorized' ? !product.category_id : product.category_id === categoryFilter);
      
      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'in_stock' ? product.in_stock : !product.in_stock);
      
      const matchesFeatured = featuredFilter === 'all' ||
        (featuredFilter === 'featured' ? product.featured : !product.featured);
      
      const matchesNewArrival = newArrivalFilter === 'all' ||
        (newArrivalFilter === 'new_arrival' ? product.new_arrival : !product.new_arrival);
      
      return matchesSearch && matchesCategory && matchesStock && matchesFeatured && matchesNewArrival;
    });
  }, [products, searchQuery, categoryFilter, stockFilter, featuredFilter, newArrivalFilter]);

  const hasActiveFilters = categoryFilter !== 'all' || stockFilter !== 'all' || 
    featuredFilter !== 'all' || newArrivalFilter !== 'all' || searchQuery !== '';

  const canReorder = !hasActiveFilters && searchQuery === '';

  const resetFilters = () => {
    setCategoryFilter('all');
    setStockFilter('all');
    setFeaturedFilter('all');
    setNewArrivalFilter('all');
    setSearchQuery('');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex(p => p.id === active.id);
    const newIndex = products.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedProducts = arrayMove(products, oldIndex, newIndex);
    setProducts(reorderedProducts);

    try {
      const updates = reorderedProducts.map((product, index) => ({
        id: product.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Product order updated');
    } catch (error) {
      console.error('Error updating product order:', error);
      toast.error('Failed to update product order');
      fetchProducts();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const { data: originalProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single();

      if (fetchError) throw fetchError;

      const { id, created_at, updated_at, display_order, ...productData } = originalProduct;
      
      const duplicatedProduct = {
        ...productData,
        name: `${productData.name} (Copy)`,
        slug: `${productData.slug}-copy-${Date.now()}`,
      };

      const { error: insertError } = await supabase
        .from('products')
        .insert(duplicatedProduct);

      if (insertError) throw insertError;

      toast.success('Product duplicated successfully');
      fetchProducts();
    } catch (error: any) {
      console.error('Error duplicating product:', error);
      toast.error(error.message || 'Failed to duplicate product');
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deletingProduct.id);

      if (error) throw error;
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingProduct(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProductIds);

      if (error) throw error;
      
      toast.success(`Deleted ${selectedProductIds.length} product(s)`);
      setSelectedProductIds([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Error bulk deleting products:', error);
      toast.error(error.message || 'Failed to delete products');
    } finally {
      setBulkDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ProductBulkEdit
              selectedProductIds={selectedProductIds}
              categories={categories}
              onComplete={fetchProducts}
              onClearSelection={() => setSelectedProductIds([])}
            />
            <ProductBulkActions
              products={products}
              categories={categories}
              onImportComplete={fetchProducts}
            />
            <Button onClick={() => navigate('/admin/products/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Selection Bar */}
        {selectedProductIds.length > 0 && (
          <div className="bg-muted/50 border rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedProductIds.length} product(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProductIds([])}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              {/* Search and Filter Toggle Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset Filters
                  </Button>
                )}
              </div>
              
              {/* Filter Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>Filters:</span>
                </div>
                
                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Stock Filter */}
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>

                {/* Featured Filter */}
                <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Featured" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="not_featured">Not Featured</SelectItem>
                  </SelectContent>
                </Select>

                {/* New Arrival Filter */}
                <Select value={newArrivalFilter} onValueChange={setNewArrivalFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="New Arrival" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new_arrival">New Arrivals</SelectItem>
                    <SelectItem value="not_new">Not New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No products found' : 'No products yet. Add your first product!'}
              </div>
            ) : (
              <>
                {!canReorder && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                    <GripVertical className="h-4 w-4" />
                    <span>Clear all filters and search to enable drag-and-drop reordering</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 w-8">
                            {canReorder && (
                              <span className="text-muted-foreground text-xs">⋮⋮</span>
                            )}
                          </th>
                          <th className="py-3 px-2 w-10">
                            <Checkbox
                              checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProductIds(filteredProducts.map(p => p.id));
                                } else {
                                  setSelectedProductIds([]);
                                }
                              }}
                            />
                          </th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Product</th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                          <th className="text-center py-3 px-2 font-medium text-muted-foreground">Stock</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <SortableContext
                        items={filteredProducts.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <tbody>
                          {filteredProducts.map((product) => (
                            <SortableProductRow
                              key={product.id}
                              product={product}
                              isSelected={selectedProductIds.includes(product.id)}
                              onSelect={(checked) => {
                                if (checked) {
                                  setSelectedProductIds(prev => [...prev, product.id]);
                                } else {
                                  setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                                }
                              }}
                              onQuickEdit={() => {
                                setQuickEditProduct(product);
                                setIsQuickEditOpen(true);
                              }}
                              onFullEdit={() => navigate(`/admin/products/${product.id}/edit`)}
                              onDuplicate={() => handleDuplicate(product)}
                              onDelete={() => {
                                setDeletingProduct(product);
                                setIsDeleteDialogOpen(true);
                              }}
                              formatCurrency={formatCurrency}
                              isDragDisabled={!canReorder}
                            />
                          ))}
                        </tbody>
                      </SortableContext>
                    </table>
                  </DndContext>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProductIds.length} Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProductIds.length} selected product(s)? This action cannot be undone and will permanently remove all selected products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedProductIds.length} Products`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Edit Sheet */}
      <ProductQuickEdit
        product={quickEditProduct}
        categories={categories}
        open={isQuickEditOpen}
        onOpenChange={setIsQuickEditOpen}
        onSave={fetchProducts}
      />
    </AdminLayout>
  );
}
