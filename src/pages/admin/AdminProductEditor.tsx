import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProductImageUpload } from '@/components/admin/ProductImageUpload';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

interface Category {
  id: string;
  name: string;
}

interface ProductSettings {
  sizesEnabled: boolean;
  colorsEnabled: boolean;
}

const initialProductForm = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  meta_description: '',
  price: 0,
  compare_at_price: 0,
  images: [] as string[],
  sizes: '',
  colors: '',
  in_stock: true,
  featured: false,
  new_arrival: false,
  category_id: '',
  stock_quantity: 0,
  low_stock_threshold: 5,
};

export default function AdminProductEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState(initialProductForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productSettings, setProductSettings] = useState<ProductSettings>({
    sizesEnabled: true,
    colorsEnabled: true,
  });

  useEffect(() => {
    fetchCategories();
    fetchProductSettings();
    if (isEditing) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [id]);

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

  async function fetchProductSettings() {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'product_options')
        .eq('category', 'products')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setProductSettings({
          sizesEnabled: true,
          colorsEnabled: true,
          ...(data.value as unknown as ProductSettings),
        });
      }
    } catch (error) {
      console.error('Error fetching product settings:', error);
    }
  }

  async function fetchProduct() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          slug: data.slug,
          short_description: data.short_description || '',
          description: data.description || '',
          meta_description: data.meta_description || '',
          price: data.price,
          compare_at_price: data.compare_at_price || 0,
          images: data.images || [],
          sizes: data.sizes?.join(', ') || '',
          colors: data.colors?.join(', ') || '',
          in_stock: data.in_stock ?? true,
          featured: data.featured ?? false,
          new_arrival: data.new_arrival ?? false,
          category_id: data.category_id || '',
          stock_quantity: data.stock_quantity ?? 0,
          low_stock_threshold: data.low_stock_threshold ?? 5,
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        short_description: formData.short_description || null,
        description: formData.description || null,
        meta_description: formData.meta_description || null,
        price: formData.price,
        compare_at_price: formData.compare_at_price || null,
        images: formData.images,
        sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        colors: formData.colors ? formData.colors.split(',').map(s => s.trim()).filter(Boolean) : [],
        in_stock: formData.in_stock,
        featured: formData.featured,
        new_arrival: formData.new_arrival,
        category_id: formData.category_id || null,
        stock_quantity: formData.stock_quantity,
        low_stock_threshold: formData.low_stock_threshold,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success('Product created successfully');
      }

      navigate('/admin/products');
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/products')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {isEditing ? 'Edit Product' : 'Add Product'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Update product information' : 'Create a new product'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/products')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Product name and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="Auto-generated from name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="short_description">Short Description</Label>
                    <span className={`text-xs ${
                      (formData.short_description.replace(/<[^>]*>/g, '').length) > 200 
                        ? 'text-destructive' 
                        : 'text-muted-foreground'
                    }`}>
                      {formData.short_description.replace(/<[^>]*>/g, '').length}/200 characters
                    </span>
                  </div>
                  <RichTextEditor
                    content={formData.short_description}
                    onChange={(content) => setFormData({ ...formData, short_description: content })}
                    placeholder="Brief product summary for listings..."
                    compact
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Long Description</Label>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Detailed product description..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Images */}
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>Upload product images (drag to reorder)</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductImageUpload
                  images={formData.images}
                  onImagesChange={(images) => setFormData({ ...formData, images })}
                />
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set product pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      required
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compare_at_price">Sale Price</Label>
                    <Input
                      id="compare_at_price"
                      type="number"
                      value={formData.compare_at_price}
                      onChange={(e) => setFormData({ ...formData, compare_at_price: Number(e.target.value) })}
                      min={0}
                      placeholder="Original price for showing discount"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variants (Sizes & Colors) */}
            {(productSettings.sizesEnabled || productSettings.colorsEnabled) && (
              <Card>
                <CardHeader>
                  <CardTitle>Variants</CardTitle>
                  <CardDescription>Product size and color options</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productSettings.sizesEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="sizes">Sizes (comma-separated)</Label>
                        <Input
                          id="sizes"
                          value={formData.sizes}
                          onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                          placeholder="S, M, L, XL"
                        />
                      </div>
                    )}
                    {productSettings.colorsEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="colors">Colors (comma-separated)</Label>
                        <Input
                          id="colors"
                          value={formData.colors}
                          onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                          placeholder="Red, Blue, Green"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
                <CardDescription>Stock and availability settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Stock Quantity</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                    <Input
                      id="low_stock_threshold"
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
                <CardDescription>Search engine optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    placeholder="Brief description for search engines (recommended: 150-160 characters)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.meta_description.length}/160 characters
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="in_stock">In Stock</Label>
                  <Switch
                    id="in_stock"
                    checked={formData.in_stock}
                    onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured">Featured</Label>
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label htmlFor="new_arrival">New Arrival</Label>
                  <Switch
                    id="new_arrival"
                    checked={formData.new_arrival}
                    onCheckedChange={(checked) => setFormData({ ...formData, new_arrival: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Category */}
            <Card>
              <CardHeader>
                <CardTitle>Category</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
