import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BlogCategory = {
  id: string;
  name: string;
  slug: string;
};

type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
  blog_categories: BlogCategory | null;
};

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const activeCategory = searchParams.get('category');

  const breadcrumbItems = [{ label: 'Blog' }];

  useEffect(() => {
    async function fetchData() {
      const [blogsRes, categoriesRes] = await Promise.all([
        supabase
          .from('blogs')
          .select('id, title, slug, excerpt, featured_image, published_at, created_at, category_id, blog_categories(id, name, slug)')
          .eq('published', true)
          .order('published_at', { ascending: false }),
        supabase
          .from('blog_categories')
          .select('id, name, slug')
          .order('name', { ascending: true }),
      ]);

      if (!blogsRes.error && blogsRes.data) {
        setBlogs(blogsRes.data);
      }
      if (!categoriesRes.error && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  const filteredBlogs = activeCategory
    ? blogs.filter(blog => blog.blog_categories?.slug === activeCategory)
    : blogs;

  const handleCategoryClick = (slug: string | null) => {
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb items={breadcrumbItems} />

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Our Blog</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover the latest trends, styling tips, and fashion insights from our experts.
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <button
              onClick={() => handleCategoryClick(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                !activeCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              All Posts
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  activeCategory === category.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[16/10] w-full rounded-lg" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              {activeCategory ? 'No posts in this category yet.' : 'No blog posts yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <Link
                key={blog.id}
                to={`/blog/${blog.slug}`}
                className="group block"
              >
                <article className="space-y-4">
                  <div className="aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                    {blog.featured_image ? (
                      <img
                        src={blog.featured_image}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <span className="text-muted-foreground">No image</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <time dateTime={blog.published_at || blog.created_at}>
                        {format(new Date(blog.published_at || blog.created_at), 'MMMM d, yyyy')}
                      </time>
                    </div>
                    {blog.blog_categories && (
                      <Badge variant="outline" className="text-xs">
                        {blog.blog_categories.name}
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-xl font-display font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {blog.title}
                  </h2>

                  {blog.excerpt && (
                    <p className="text-muted-foreground line-clamp-3">
                      {blog.excerpt}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    Read More
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
