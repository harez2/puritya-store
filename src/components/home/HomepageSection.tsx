import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/products/ProductCard';
import { supabase, Product } from '@/lib/supabase';
import { format } from 'date-fns';
import { HomepageSection as HomepageSectionType } from '@/contexts/SiteSettingsContext';
import { Card, CardContent } from '@/components/ui/card';

type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
};

type Review = {
  id: string;
  title: string;
  content: string;
  rating: number;
  created_at: string;
  product_id: string;
  products?: { name: string; slug: string } | null;
};

interface HomepageSectionProps {
  section: HomepageSectionType;
}

export function HomepageSection({ section }: HomepageSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = section.settings?.limit || 4;
  const columns = section.settings?.columns || 4;
  const showViewAll = section.settings?.showViewAll !== false;
  const background = section.settings?.background || 'default';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        switch (section.type) {
          case 'new_in':
            const { data: newProducts } = await supabase
              .from('products')
              .select('*')
              .eq('new_arrival', true)
              .order('display_order', { ascending: true })
              .limit(limit);
            setProducts(newProducts || []);
            break;

          case 'on_sale':
            // Fetch products with compare_at_price set and filter client-side
            const { data: saleProducts } = await supabase
              .from('products')
              .select('*')
              .not('compare_at_price', 'is', null)
              .order('display_order', { ascending: true })
              .limit(50); // Fetch more to filter
            const filteredSale = (saleProducts || [])
              .filter(p => p.compare_at_price && Number(p.compare_at_price) > Number(p.price))
              .slice(0, limit);
            setProducts(filteredSale);
            break;

          case 'featured':
            const { data: featuredProducts } = await supabase
              .from('products')
              .select('*')
              .eq('featured', true)
              .order('display_order', { ascending: true })
              .limit(limit);
            setProducts(featuredProducts || []);
            break;

          case 'blogs':
            const { data: blogPosts } = await supabase
              .from('blogs')
              .select('id, title, slug, excerpt, featured_image, published_at')
              .eq('published', true)
              .order('published_at', { ascending: false })
              .limit(limit);
            setBlogs(blogPosts || []);
            break;

          case 'custom':
            const contentType = section.settings?.contentType;
            if (contentType === 'products_category' && section.settings?.categoryId) {
              const { data: categoryProducts } = await supabase
                .from('products')
                .select('*')
                .eq('category_id', section.settings.categoryId)
                .order('display_order', { ascending: true })
                .limit(limit);
              setProducts(categoryProducts || []);
            } else if (contentType === 'reviews') {
              const { data: reviewsData } = await supabase
                .from('product_reviews')
                .select('id, title, content, rating, created_at, product_id, products(name, slug)')
                .eq('approved', true)
                .order('created_at', { ascending: false })
                .limit(limit);
              setReviews((reviewsData as Review[]) || []);
            } else if (contentType === 'blogs_category' && section.settings?.blogCategoryId) {
              const { data: categoryBlogs } = await supabase
                .from('blogs')
                .select('id, title, slug, excerpt, featured_image, published_at')
                .eq('published', true)
                .eq('category_id', section.settings.blogCategoryId)
                .order('published_at', { ascending: false })
                .limit(limit);
              setBlogs(categoryBlogs || []);
            }
            break;

          default:
            break;
        }
      } catch (error) {
        console.error('Error fetching section data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [section.type, limit]);

  const getViewAllLink = () => {
    if (section.settings?.viewAllLink) return section.settings.viewAllLink;
    switch (section.type) {
      case 'new_in':
        return '/shop?filter=new';
      case 'on_sale':
        return '/shop?filter=sale';
      case 'featured':
        return '/shop';
      case 'blogs':
        return '/blog';
      default:
        return '/shop';
    }
  };

  const bgClass = background === 'secondary' ? 'bg-secondary' : background === 'accent' ? 'bg-accent' : '';

  // Product sections
  if (['new_in', 'on_sale', 'featured'].includes(section.type)) {
    if (loading) {
      return (
        <section className={`py-20 ${bgClass}`}>
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <div className="h-10 w-64 bg-muted animate-pulse rounded" />
                <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
              </div>
            </div>
            <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-6`}>
              {Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (products.length === 0) return null;

    return (
      <section className={`py-20 ${bgClass}`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-display text-4xl mb-2">{section.title}</h2>
              {section.subtitle && (
                <p className="text-muted-foreground">{section.subtitle}</p>
              )}
            </div>
            {showViewAll && (
              <Button variant="outline" asChild>
                <Link to={getViewAllLink()}>View All</Link>
              </Button>
            )}
          </div>
          <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-6`}>
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Blog section
  if (section.type === 'blogs') {
    if (loading) {
      return (
        <section className={`py-20 ${bgClass}`}>
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <div className="h-10 w-64 bg-muted animate-pulse rounded" />
                <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[16/10] bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (blogs.length === 0) return null;

    return (
      <section className={`py-20 ${bgClass}`}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-display text-4xl mb-2">{section.title}</h2>
              {section.subtitle && (
                <p className="text-muted-foreground">{section.subtitle}</p>
              )}
            </div>
            {showViewAll && (
              <Button variant="outline" asChild>
                <Link to={getViewAllLink()}>View All Posts</Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map((blog, i) => (
              <motion.article
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <Link to={`/blog/${blog.slug}`} className="block">
                  <div className="aspect-[16/10] rounded-lg overflow-hidden mb-4 bg-muted">
                    {blog.featured_image ? (
                      <img
                        src={blog.featured_image}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    {blog.published_at && format(new Date(blog.published_at), 'MMM d, yyyy')}
                  </div>
                  <h3 className="font-display text-xl mb-2 group-hover:text-primary transition-colors">
                    {blog.title}
                  </h3>
                  {blog.excerpt && (
                    <p className="text-muted-foreground text-sm line-clamp-2">{blog.excerpt}</p>
                  )}
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Custom section with content type
  if (section.type === 'custom') {
    const contentType = section.settings?.contentType;

    // Products from category
    if (contentType === 'products_category') {
      if (loading) {
        return (
          <section className={`py-20 ${bgClass}`}>
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <div className="h-10 w-64 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
                </div>
              </div>
              <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-6`}>
                {Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
          </section>
        );
      }

      if (products.length === 0) return null;

      return (
        <section className={`py-20 ${bgClass}`}>
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="font-display text-4xl mb-2">{section.title}</h2>
                {section.subtitle && (
                  <p className="text-muted-foreground">{section.subtitle}</p>
                )}
              </div>
              {showViewAll && (
                <Button variant="outline" asChild>
                  <Link to={getViewAllLink()}>View All</Link>
                </Button>
              )}
            </div>
            <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-6`}>
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      );
    }

    // Customer reviews
    if (contentType === 'reviews') {
      if (loading) {
        return (
          <section className={`py-20 ${bgClass}`}>
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <div className="h-10 w-64 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: limit }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
          </section>
        );
      }

      if (reviews.length === 0) return null;

      return (
        <section className={`py-20 ${bgClass}`}>
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="font-display text-4xl mb-2">{section.title}</h2>
                {section.subtitle && (
                  <p className="text-muted-foreground">{section.subtitle}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`h-4 w-4 ${idx < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                      <h4 className="font-semibold mb-2">{review.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {review.content}
                      </p>
                      {review.products && (
                        <Link
                          to={`/product/${review.products.slug}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {review.products.name}
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // Blogs from category (same layout as regular blogs)
    if (contentType === 'blogs_category') {
      if (loading) {
        return (
          <section className={`py-20 ${bgClass}`}>
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <div className="h-10 w-64 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="aspect-[16/10] bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
          </section>
        );
      }

      if (blogs.length === 0) return null;

      return (
        <section className={`py-20 ${bgClass}`}>
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="font-display text-4xl mb-2">{section.title}</h2>
                {section.subtitle && (
                  <p className="text-muted-foreground">{section.subtitle}</p>
                )}
              </div>
              {showViewAll && (
                <Button variant="outline" asChild>
                  <Link to={getViewAllLink()}>View All Posts</Link>
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogs.map((blog, i) => (
                <motion.article
                  key={blog.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Link to={`/blog/${blog.slug}`} className="block">
                    <div className="aspect-[16/10] rounded-lg overflow-hidden mb-4 bg-muted">
                      {blog.featured_image ? (
                        <img
                          src={blog.featured_image}
                          alt={blog.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      {blog.published_at && format(new Date(blog.published_at), 'MMM d, yyyy')}
                    </div>
                    <h3 className="font-display text-xl mb-2 group-hover:text-primary transition-colors">
                      {blog.title}
                    </h3>
                    {blog.excerpt && (
                      <p className="text-muted-foreground text-sm line-clamp-2">{blog.excerpt}</p>
                    )}
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // Fallback for custom section without content type configured
    return (
      <section className={`py-20 ${bgClass}`}>
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="font-display text-4xl mb-2">{section.title}</h2>
            {section.subtitle && (
              <p className="text-muted-foreground">{section.subtitle}</p>
            )}
            <p className="text-muted-foreground mt-4 text-sm">
              Configure this section's content type in the admin panel.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
