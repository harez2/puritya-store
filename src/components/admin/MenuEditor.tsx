import { useState, useEffect, useMemo } from 'react';
import { GripVertical, Plus, Trash2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  type: 'internal' | 'external';
}

interface MenuEditorProps {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  maxItems?: number;
}

interface InternalPage {
  label: string;
  value: string;
  group?: string;
}

// Static pages that are always available
const staticPages: InternalPage[] = [
  { label: 'Home', value: '/', group: 'Main' },
  { label: 'Shop', value: '/shop', group: 'Main' },
  { label: 'New Arrivals', value: '/shop?filter=new', group: 'Shop' },
  { label: 'Sale', value: '/shop?filter=sale', group: 'Shop' },
  { label: 'Blog', value: '/blog', group: 'Main' },
  { label: 'Wishlist', value: '/wishlist', group: 'Account' },
  { label: 'Account', value: '/account', group: 'Account' },
  { label: 'Order History', value: '/order-history', group: 'Account' },
  { label: 'Addresses', value: '/addresses', group: 'Account' },
  { label: 'Cart/Checkout', value: '/checkout', group: 'Account' },
  { label: 'Track Order', value: '/track-order', group: 'Account' },
];

export function MenuEditor({ items, onChange, maxItems = 10 }: MenuEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dynamicPages, setDynamicPages] = useState<InternalPage[]>([]);

  // Fetch dynamic pages from database
  useEffect(() => {
    const fetchDynamicPages = async () => {
      const pages: InternalPage[] = [];

      // Fetch categories
      const { data: categories } = await supabase
        .from('categories')
        .select('name, slug')
        .order('name');
      
      if (categories) {
        categories.forEach(cat => {
          pages.push({
            label: cat.name,
            value: `/shop?category=${cat.slug}`,
            group: 'Categories'
          });
        });
      }

      // Fetch custom pages
      const { data: customPages } = await supabase
        .from('pages')
        .select('title, slug')
        .eq('published', true)
        .order('title');
      
      if (customPages) {
        customPages.forEach(page => {
          pages.push({
            label: page.title,
            value: `/${page.slug}`,
            group: 'Pages'
          });
        });
      }

      // Fetch landing pages
      const { data: landingPages } = await supabase
        .from('landing_pages')
        .select('title, slug')
        .eq('status', 'published')
        .order('title');
      
      if (landingPages) {
        landingPages.forEach(lp => {
          pages.push({
            label: lp.title,
            value: `/p/${lp.slug}`,
            group: 'Landing Pages'
          });
        });
      }

      // Fetch blog categories
      const { data: blogCategories } = await supabase
        .from('blog_categories')
        .select('name, slug')
        .order('name');
      
      if (blogCategories) {
        blogCategories.forEach(bc => {
          pages.push({
            label: `Blog: ${bc.name}`,
            value: `/blog?category=${bc.slug}`,
            group: 'Blog Categories'
          });
        });
      }

      setDynamicPages(pages);
    };

    fetchDynamicPages();
  }, []);

  // Combine static and dynamic pages
  const allInternalPages = useMemo(() => {
    return [...staticPages, ...dynamicPages];
  }, [dynamicPages]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    onChange(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const addItem = () => {
    if (items.length >= maxItems) return;
    const newItem: MenuItem = {
      id: Date.now().toString(),
      label: 'New Link',
      url: '/',
      type: 'internal',
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<MenuItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card
          key={item.id}
          className={`transition-all ${
            dragOverIndex === index ? 'border-primary border-2' : ''
          } ${draggedIndex === index ? 'opacity-50' : ''}`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="cursor-grab active:cursor-grabbing pt-2">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={item.label}
                      onChange={(e) => updateItem(index, { label: e.target.value })}
                      placeholder="Link text"
                      className="h-9"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Link Type</Label>
                    <Select
                      value={item.type}
                      onValueChange={(value: 'internal' | 'external') => 
                        updateItem(index, { type: value, url: value === 'internal' ? '/' : 'https://' })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">
                          <span className="flex items-center gap-2">
                            <LinkIcon className="h-3 w-3" /> Internal Page
                          </span>
                        </SelectItem>
                        <SelectItem value="external">
                          <span className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" /> External URL
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {item.type === 'internal' ? 'Page' : 'URL'}
                  </Label>
                  {item.type === 'internal' ? (
                    <Select
                      value={item.url}
                      onValueChange={(value) => updateItem(index, { url: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a page" />
                      </SelectTrigger>
                      <SelectContent>
                        {allInternalPages.map((page) => (
                          <SelectItem key={page.value} value={page.value}>
                            {page.group ? `${page.group} → ${page.label}` : page.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={item.url}
                      onChange={(e) => updateItem(index, { url: e.target.value })}
                      placeholder="https://example.com"
                      className="h-9"
                    />
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {items.length < maxItems && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={addItem}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No menu items yet. Click "Add Menu Item" to get started.</p>
        </div>
      )}
    </div>
  );
}
