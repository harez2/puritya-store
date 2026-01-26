import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { LandingPageSection } from '@/components/landing/LandingPageSection';
import NotFound from './NotFound';

interface LandingPageData {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  sections: any[];
  header_visible: boolean;
  footer_visible: boolean;
  custom_css: string | null;
}

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['landing-page-public', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      
      if (error) throw error;
      return data as LandingPageData | null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !page) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.og_image && <meta property="og:image" content={page.og_image} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        {page.meta_description && <meta property="og:description" content={page.meta_description} />}
      </Helmet>

      {page.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
      )}

      {page.header_visible && <Header />}

      <main className="min-h-screen">
        {(page.sections || []).map((section: any, index: number) => (
          <LandingPageSection key={section.id || index} section={section} />
        ))}
      </main>

      {page.footer_visible && <Footer />}
    </>
  );
}
