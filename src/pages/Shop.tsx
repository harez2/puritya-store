import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb, { type BreadcrumbItemType } from '@/components/layout/PageBreadcrumb';
import ProductCard from '@/components/products/ProductCard';
import { supabase, Product, Category } from '@/lib/supabase';
import { trackViewItemList, trackSearch, DataLayerProduct } from '@/lib/data-layer';

export default function Shop() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  const categoryFilter = searchParams.get('category');
  const searchQuery = searchParams.get('search');
  const filter = searchParams.get('filter');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          supabase.from('products').select('*, category:categories(*)'),
          supabase.from('categories').select('*'),
        ]);

        let filteredProducts = productsRes.data || [];

        if (categoryFilter) {
          filteredProducts = filteredProducts.filter(
            p => p.category?.slug === categoryFilter
          );
        }
        if (filter === 'new') {
          filteredProducts = filteredProducts.filter(p => p.new_arrival);
        }
        if (searchQuery) {
          filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        setProducts(filteredProducts);
        setCategories(categoriesRes.data || []);
        
        // Track view_item_list in data layer
        if (filteredProducts.length > 0) {
          const listName = categoryFilter 
            ? `Category: ${categoryFilter}` 
            : filter === 'new' 
              ? 'New Arrivals' 
              : searchQuery 
                ? `Search: ${searchQuery}` 
                : 'Shop All';
          
          const dataLayerProducts: DataLayerProduct[] = filteredProducts.slice(0, 20).map((p, index) => ({
            item_id: p.id,
            item_name: p.name,
            price: Number(p.price),
            item_category: p.category?.name,
            index,
          }));
          
          trackViewItemList(dataLayerProducts, listName, 'BDT');
        }
        
        // Track search event
        if (searchQuery) {
          trackSearch(searchQuery);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [categoryFilter, searchQuery, filter]);

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return Number(a.price) - Number(b.price);
      case 'price-high': return Number(b.price) - Number(a.price);
      case 'name': return a.name.localeCompare(b.name);
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const breadcrumbItems = useMemo((): BreadcrumbItemType[] => {
    const items: BreadcrumbItemType[] = [{ label: 'Shop', href: '/shop' }];
    if (categoryFilter) {
      const category = categories.find(c => c.slug === categoryFilter);
      if (category) items.push({ label: category.name });
    } else if (filter === 'new') {
      items.push({ label: 'New Arrivals' });
    } else if (searchQuery) {
      items.push({ label: `Search: "${searchQuery}"` });
    }
    return items;
  }, [categoryFilter, categories, filter, searchQuery]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb items={breadcrumbItems} className="mb-6" />
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-5xl mb-4">
            {categoryFilter ? categories.find(c => c.slug === categoryFilter)?.name || 'Shop' : 
             filter === 'new' ? 'New Arrivals' : 
             searchQuery ? `Results for "${searchQuery}"` : 'Shop All'}
          </h1>
          <p className="text-muted-foreground">
            {products.length} products
          </p>
        </motion.div>

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden">
                <Filter className="h-4 w-4 mr-2" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {categories.map(cat => (
                  <a
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    className="block py-2 hover:text-primary"
                  >
                    {cat.name}
                  </a>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden md:flex gap-4">
            <Button variant={!categoryFilter ? 'default' : 'outline'} asChild>
              <a href="/shop">All</a>
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.slug ? 'default' : 'outline'}
                asChild
              >
                <a href={`/shop?category=${cat.slug}`}>{cat.name}</a>
              </Button>
            ))}
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded mt-4 w-3/4" />
                <div className="h-4 bg-muted rounded mt-2 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No products found</p>
            <Button className="mt-4" asChild>
              <a href="/shop">View All Products</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {sortedProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
