import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import NotFound from './NotFound';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  published: boolean;
}

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useSiteSettings();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Page not found
        }
        throw error;
      }
      return data as Page;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-12 w-2/3 mb-8" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!page) {
    return <NotFound />;
  }

  return (
    <Layout>
      <Helmet>
        <title>{page.title} | {settings.store_name}</title>
        {page.meta_description && (
          <meta name="description" content={page.meta_description} />
        )}
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-12">
            {page.title}
          </h1>

          <div 
            className="prose prose-lg max-w-none
              prose-headings:font-display prose-headings:font-semibold
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-ul:text-muted-foreground prose-ol:text-muted-foreground
              prose-li:marker:text-primary
              prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </div>
    </Layout>
  );
}
