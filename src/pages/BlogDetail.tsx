import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { Calendar, ArrowLeft } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb, { BreadcrumbItemType } from '@/components/layout/PageBreadcrumb';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const SITE_URL = 'https://puritya-store.lovable.app';

type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
};

type RelatedPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
};

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Must call useMemo before any early returns
  const breadcrumbItems = useMemo((): BreadcrumbItemType[] => {
    if (!blog) return [{ label: 'Blog', href: '/blog' }];
    return [
      { label: 'Blog', href: '/blog' },
      { label: blog.title }
    ];
  }, [blog]);

  useEffect(() => {
    async function fetchBlog() {
      if (!slug) return;

      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (!error && data) {
        setBlog(data);
        
        // Fetch related posts from same category
        if (data.category_id) {
          const { data: related } = await supabase
            .from('blogs')
            .select('id, title, slug, excerpt, featured_image, published_at, created_at')
            .eq('published', true)
            .eq('category_id', data.category_id)
            .neq('id', data.id)
            .order('published_at', { ascending: false })
            .limit(3);
          
          if (related) {
            setRelatedPosts(related);
          }
        } else {
          // If no category, show latest posts excluding current
          const { data: latest } = await supabase
            .from('blogs')
            .select('id, title, slug, excerpt, featured_image, published_at, created_at')
            .eq('published', true)
            .neq('id', data.id)
            .order('published_at', { ascending: false })
            .limit(3);
          
          if (latest) {
            setRelatedPosts(latest);
          }
        }
      }
      setLoading(false);
    }

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-6 w-48 mb-8" />
          <Skeleton className="aspect-[16/9] w-full rounded-lg mb-8" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-4 w-32 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!blog) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Blog Post Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // Strip HTML tags for meta description
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const metaDescription = blog.excerpt || stripHtml(blog.content).substring(0, 160);
  const canonicalUrl = `${SITE_URL}/blog/${blog.slug}`;
  const publishedDate = blog.published_at || blog.created_at;

  // JSON-LD structured data for Article schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: metaDescription,
    image: blog.featured_image || undefined,
    datePublished: publishedDate,
    dateModified: publishedDate,
    url: canonicalUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Puritya Store',
      url: SITE_URL,
    },
    author: {
      '@type': 'Organization',
      name: 'Puritya Store',
    },
  };

  return (
    <Layout>
      <Helmet>
        <title>{blog.title} | Puritya Store Blog</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        {blog.featured_image && <meta property="og:image" content={blog.featured_image} />}
        <meta property="article:published_time" content={publishedDate} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blog.title} />
        <meta name="twitter:description" content={metaDescription} />
        {blog.featured_image && <meta name="twitter:image" content={blog.featured_image} />}

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <article className="container mx-auto px-4 py-8 max-w-4xl">
        <PageBreadcrumb items={breadcrumbItems} />

        {blog.featured_image && (
          <div className="aspect-[16/9] overflow-hidden rounded-lg mb-8">
            <img
              src={blog.featured_image}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            {blog.title}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <time dateTime={blog.published_at || blog.created_at}>
              {format(new Date(blog.published_at || blog.created_at), 'MMMM d, yyyy')}
            </time>
          </div>
        </header>

        <div 
          className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        <div className="mt-12 pt-8 border-t border-border">
          <Button variant="outline" asChild>
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>

        {/* Related Posts Section */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-8 border-t border-border">
            <h2 className="text-2xl font-display font-bold mb-8">Related Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group block"
                >
                  <article className="h-full">
                    {post.featured_image && (
                      <div className="aspect-[16/9] overflow-hidden rounded-lg mb-4">
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      <time dateTime={post.published_at || post.created_at}>
                        {format(new Date(post.published_at || post.created_at), 'MMM d, yyyy')}
                      </time>
                    </div>
                    <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
}
