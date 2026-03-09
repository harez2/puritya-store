import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search, X, Filter, RotateCcw, GripVertical, Copy, Loader2, ArchiveRestore, AlertTriangle } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  deleted_at: string | null;
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
  const [bulkDuplicating, setBulkDuplicating] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [isEmptyTrashDialogOpen, setIsEmptyTrashDialogOpen] = useState(false);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
  
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

  // Separate active and trashed products
  const activeProducts = useMemo(() => products.filter(p => !p.deleted_at), [products]);
  const trashedProducts = useMemo(() => products.filter(p => !!p.deleted_at), [products]);

  const currentProducts = activeTab === 'active' ? activeProducts : trashedProducts;

  const filteredProducts = useMemo(() => {
    return currentProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.slug.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'trash') return matchesSearch;

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
  }, [currentProducts, searchQuery, categoryFilter, stockFilter, featuredFilter, newArrivalFilter, activeTab]);

  const hasActiveFilters = categoryFilter !== 'all' || stockFilter !== 'all' || 
    featuredFilter !== 'all' || newArrivalFilter !== 'all' || searchQuery !== '';

  const canReorder = !hasActiveFilters && searchQuery === '' && activeTab === 'active';

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

    const activeList = activeProducts;
    const oldIndex = activeList.findIndex(p => p.id === active.id);
    const newIndex = activeList.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedProducts = arrayMove(activeList, oldIndex, newIndex);
    // Update the full products list
    const trashedIds = new Set(trashedProducts.map(p => p.id));
    setProducts([...reorderedProducts, ...products.filter(p => trashedIds.has(p.id))]);

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

      const { id, created_at, updated_at, display_order, deleted_at, ...productData } = originalProduct;
      
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

  // Soft delete - move to trash
  const handleMoveToTrash = async () => {
    if (!deletingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingProduct.id);

      if (error) throw error;
      toast.success('Product moved to trash');
      fetchProducts();
    } catch (error: any) {
      console.error('Error moving product to trash:', error);
      toast.error(error.message || 'Failed to move product to trash');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingProduct(null);
    }
  };

  // Permanent delete
  const handlePermanentDelete = async () => {
    if (!deletingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deletingProduct.id);

      if (error) throw error;
      toast.success('Product permanently deleted');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    } finally {
      setIsPermanentDeleteDialogOpen(false);
      setDeletingProduct(null);
    }
  };

  // Restore from trash
  const handleRestore = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .eq('id', product.id);

      if (error) throw error;
      toast.success('Product restored');
      fetchProducts();
    } catch (error: any) {
      console.error('Error restoring product:', error);
      toast.error(error.message || 'Failed to restore product');
    }
  };

  // Bulk soft delete
  const handleBulkMoveToTrash = async () => {
    if (selectedProductIds.length === 0) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', selectedProductIds);

      if (error) throw error;
      
      toast.success(`Moved ${selectedProductIds.length} product(s) to trash`);
      setSelectedProductIds([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Error moving products to trash:', error);
      toast.error(error.message || 'Failed to move products to trash');
    } finally {
      setBulkDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  // Bulk permanent delete
  const handleBulkPermanentDelete = async () => {
    if (selectedProductIds.length === 0) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProductIds);

      if (error) throw error;
      
      toast.success(`Permanently deleted ${selectedProductIds.length} product(s)`);
      setSelectedProductIds([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting products:', error);
      toast.error(error.message || 'Failed to delete products');
    } finally {
      setBulkDeleting(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  // Bulk restore
  const handleBulkRestore = async () => {
    if (selectedProductIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .in('id', selectedProductIds);

      if (error) throw error;
      
      toast.success(`Restored ${selectedProductIds.length} product(s)`);
      setSelectedProductIds([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Error restoring products:', error);
      toast.error(error.message || 'Failed to restore products');
    }
  };

  // Empty trash
  const handleEmptyTrash = async () => {
    const trashIds = trashedProducts.map(p => p.id);
    if (trashIds.length === 0) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', trashIds);

      if (error) throw error;
      
      toast.success('Trash emptied successfully');
      setSelectedProductIds([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Error emptying trash:', error);
      toast.error(error.message || 'Failed to empty trash');
    } finally {
      setBulkDeleting(false);
      setIsEmptyTrashDialogOpen(false);
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedProductIds.length === 0) return;

    setBulkDuplicating(true);
    try {
      const { data: originalProducts, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .in('id', selectedProductIds);

      if (fetchError) throw fetchError;

      const duplicatedProducts = originalProducts.map(product => {
        const { id, created_at, updated_at, display_order, deleted_at, ...productData } = product;
        return {
          ...productData,
          name: `${productData.name} (Copy)`,
          slug: `${productData.slug}-copy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        };
      });

      const { error: insertError } = await supabase
        .from('products')
        .insert(duplicatedProducts);

      if (insertError) throw insertError;

      toast.success(`Duplicated ${selectedProductIds.length} product(s)`);
      setSelectedProductIds([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Error bulk duplicating products:', error);
      toast.error(error.message || 'Failed to duplicate products');
    } finally {
      setBulkDuplicating(false);
    }
  };

  // Clear selection when switching tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'active' | 'trash');
    setSelectedProductIds([]);
    setSearchQuery('');
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'active' && (
              <>
                <ProductBulkEdit
                  selectedProductIds={selectedProductIds}
                  categories={categories}
                  onComplete={fetchProducts}
                  onClearSelection={() => setSelectedProductIds([])}
                />
                <ProductBulkActions
                  products={activeProducts}
                  categories={categories}
                  onImportComplete={fetchProducts}
                />
                <Button onClick={() => navigate('/admin/products/new')} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </>
            )}
            {activeTab === 'trash' && trashedProducts.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setIsEmptyTrashDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Empty Trash
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              Active
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeProducts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Trash
              {trashedProducts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {trashedProducts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Selection Bar */}
        {selectedProductIds.length > 0 && (
          <div className="bg-muted/50 border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {selectedProductIds.length} product(s) selected
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'active' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDuplicate}
                    disabled={bulkDuplicating}
                  >
                    {bulkDuplicating ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Duplicate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Trash
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkRestore}
                  >
                    <ArchiveRestore className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
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
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === 'active' ? "Search products..." : "Search trash..."}
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
              
              {/* Filter Row - only show for active tab */}
              {activeTab === 'active' && (
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>Filters:</span>
                  </div>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[calc(50%-4px)] sm:w-[160px] h-9">
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

                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="w-[calc(50%-4px)] sm:w-[140px] h-9">
                      <SelectValue placeholder="Stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                    <SelectTrigger className="w-[calc(50%-4px)] sm:w-[130px] h-9">
                      <SelectValue placeholder="Featured" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="not_featured">Not Featured</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={newArrivalFilter} onValueChange={setNewArrivalFilter}>
                    <SelectTrigger className="w-[calc(50%-4px)] sm:w-[140px] h-9">
                      <SelectValue placeholder="New Arrival" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="new_arrival">New Arrivals</SelectItem>
                      <SelectItem value="not_new">Not New</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activeTab === 'trash' 
                  ? 'Trash is empty' 
                  : searchQuery ? 'No products found' : 'No products yet. Add your first product!'}
              </div>
            ) : (
              <>
                {activeTab === 'active' && !canReorder && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                    <GripVertical className="h-4 w-4" />
                    <span>Clear all filters and search to enable drag-and-drop reordering</span>
                  </div>
                )}
                {activeTab === 'trash' && (
                  <div className="mb-4 p-3 bg-destructive/10 rounded-lg text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Trashed products are hidden from your store. Restore them to make them visible again.</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  {activeTab === 'active' ? (
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
                  ) : (
                    /* Trash table - no drag and drop */
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
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
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">Deleted</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="border-b hover:bg-muted/50 opacity-70">
                            <td className="py-3 px-2">
                              <Checkbox
                                checked={selectedProductIds.includes(product.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedProductIds(prev => [...prev, product.id]);
                                  } else {
                                    setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-3">
                                {product.images?.[0] ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                    No img
                                  </div>
                                )}
                                <span className="font-medium line-through">{product.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-sm text-muted-foreground">
                              {product.deleted_at ? new Date(product.deleted_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-2 text-right text-sm">
                              {formatCurrency(product.price)}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(product)}
                                >
                                  <ArchiveRestore className="h-4 w-4 mr-1" />
                                  Restore
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingProduct(product);
                                    setIsPermanentDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Move to Trash Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move "{deletingProduct?.name}" to trash? You can restore it later from the Trash tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={isPermanentDeleteDialogOpen} onOpenChange={setIsPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeTab === 'active' 
                ? `Move ${selectedProductIds.length} Products to Trash`
                : `Permanently Delete ${selectedProductIds.length} Products`
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeTab === 'active'
                ? `Are you sure you want to move ${selectedProductIds.length} selected product(s) to trash? You can restore them later.`
                : `Are you sure you want to permanently delete ${selectedProductIds.length} selected product(s)? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={activeTab === 'active' ? handleBulkMoveToTrash : handleBulkPermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Processing...' : (activeTab === 'active' ? 'Move to Trash' : 'Delete Permanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={isEmptyTrashDialogOpen} onOpenChange={setIsEmptyTrashDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete all {trashedProducts.length} product(s) in trash? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Emptying...' : 'Empty Trash'}
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
