import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';

type BlogCategory = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
};

type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  author_id: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  meta_description: string | null;
  related_products: string[] | null;
  blog_categories: BlogCategory | null;
};

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export default function AdminBlogs() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    published: false,
    category_id: '',
    meta_description: '',
    related_products: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [blogsRes, categoriesRes, productsRes] = await Promise.all([
      supabase
        .from('blogs')
        .select('*, blog_categories(id, name, slug)')
        .order('created_at', { ascending: false }),
      supabase
        .from('blog_categories')
        .select('id, name, slug')
        .order('name', { ascending: true }),
      supabase
        .from('products')
        .select('id, name, slug, price, images')
        .order('name', { ascending: true }),
    ]);

    if (!blogsRes.error && blogsRes.data) {
      setBlogs(blogsRes.data);
    }
    if (!categoriesRes.error && categoriesRes.data) {
      setCategories(categoriesRes.data);
    }
    if (!productsRes.error && productsRes.data) {
      setProducts(productsRes.data);
    }
    setLoading(false);
  }

  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || blog.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: selectedBlog ? prev.slug : generateSlug(title),
    }));
  };

  const openCreateDialog = () => {
    setSelectedBlog(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featured_image: '',
      published: false,
      category_id: '',
      meta_description: '',
      related_products: [],
    });
    setProductSearchQuery('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (blog: Blog) => {
    setSelectedBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || '',
      content: blog.content,
      featured_image: blog.featured_image || '',
      published: blog.published,
      category_id: blog.category_id || '',
      meta_description: blog.meta_description || '',
      related_products: blog.related_products || [],
    });
    setProductSearchQuery('');
    setIsDialogOpen(true);
  };

  const toggleProductSelection = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      related_products: prev.related_products.includes(productId)
        ? prev.related_products.filter(id => id !== productId)
        : [...prev.related_products, productId],
    }));
  };

  const removeProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      related_products: prev.related_products.filter(id => id !== productId),
    }));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const openDeleteDialog = (blog: Blog) => {
    setSelectedBlog(blog);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);

    try {
      const blogData = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        excerpt: formData.excerpt || null,
        content: formData.content,
        featured_image: formData.featured_image || null,
        published: formData.published,
        published_at: formData.published ? new Date().toISOString() : null,
        author_id: user?.id,
        category_id: formData.category_id || null,
        meta_description: formData.meta_description || null,
        related_products: formData.related_products.length > 0 ? formData.related_products : null,
      };

      if (selectedBlog) {
        const { error } = await supabase
          .from('blogs')
          .update(blogData)
          .eq('id', selectedBlog.id);

        if (error) throw error;
        toast.success('Blog post updated');
      } else {
        const { error } = await supabase
          .from('blogs')
          .insert([blogData]);

        if (error) throw error;
        toast.success('Blog post created');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBlog) return;

    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', selectedBlog.id);

      if (error) throw error;
      toast.success('Blog post deleted');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete blog post');
    }
  };

  const togglePublished = async (blog: Blog) => {
    try {
      const { error } = await supabase
        .from('blogs')
        .update({
          published: !blog.published,
          published_at: !blog.published ? new Date().toISOString() : null,
        })
        .eq('id', blog.id);

      if (error) throw error;
      toast.success(blog.published ? 'Blog unpublished' : 'Blog published');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update blog');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Blog Posts</h1>
            <p className="text-muted-foreground">Manage your blog content</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredBlogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No blog posts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBlogs.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {blog.featured_image && (
                          <img
                            src={blog.featured_image}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{blog.title}</div>
                          <div className="text-sm text-muted-foreground">/{blog.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {blog.blog_categories ? (
                        <Badge variant="outline">{blog.blog_categories.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={blog.published ? 'default' : 'secondary'}>
                        {blog.published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {blog.published_at
                        ? format(new Date(blog.published_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(blog.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePublished(blog)}
                          title={blog.published ? 'Unpublish' : 'Publish'}
                        >
                          {blog.published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(blog)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(blog)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBlog ? 'Edit Blog Post' : 'Create Blog Post'}
            </DialogTitle>
            <DialogDescription>
              {selectedBlog ? 'Update your blog post details' : 'Create a new blog post'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter blog title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="blog-post-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Brief description of the post..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description (SEO)</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Search engine description (recommended: 150-160 characters)"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                {formData.meta_description.length}/160 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>Featured Image</Label>
              <SingleImageUpload
                image={formData.featured_image || null}
                onImageChange={(url) => setFormData(prev => ({ ...prev, featured_image: url || '' }))}
                folder="blogs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                placeholder="Write your blog content here..."
              />
            </div>

            {/* Related Products Section */}
            <div className="space-y-2">
              <Label>Related Products</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select products to show as recommendations at the bottom of this blog post
              </p>
              
              {/* Selected Products */}
              {formData.related_products.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.related_products.map(productId => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return null;
                    return (
                      <div
                        key={productId}
                        className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm"
                      >
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt=""
                            className="w-5 h-5 rounded object-cover"
                          />
                        )}
                        <span className="max-w-32 truncate">{product.name}</span>
                        <button
                          type="button"
                          onClick={() => removeProduct(productId)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Product Search */}
              <Input
                placeholder="Search products..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="mb-2"
              />

              {/* Product List */}
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-1">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => toggleProductSelection(product.id)}
                    >
                      <Checkbox
                        checked={formData.related_products.includes(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">৳{product.price.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No products found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
              />
              <Label htmlFor="published">Publish immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : selectedBlog ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBlog?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
