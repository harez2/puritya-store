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
};

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
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
      </article>
    </Layout>
  );
}
