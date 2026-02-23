import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from './Header';
import Footer from './Footer';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const { settings } = useSiteSettings();

  // Build robots meta content
  const robotsContent = [
    settings.seo_robots_index !== false ? 'index' : 'noindex',
    settings.seo_robots_follow !== false ? 'follow' : 'nofollow',
  ].join(', ');

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        {/* Global SEO defaults - can be overridden by page-specific Helmet */}
        {settings.seo_default_description && (
          <meta name="description" content={settings.seo_default_description} />
        )}
        {settings.seo_default_keywords && (
          <meta name="keywords" content={settings.seo_default_keywords} />
        )}
        <meta name="robots" content={robotsContent} />
        
        {/* Open Graph defaults */}
        <meta property="og:site_name" content={settings.store_name} />
        <meta property="og:image" content={settings.seo_og_image || settings.logo_url || ''} />
        
        {/* Twitter Card defaults */}
        <meta name="twitter:card" content="summary_large_image" />
        {settings.seo_twitter_handle && (
          <meta name="twitter:site" content={settings.seo_twitter_handle} />
        )}
        <meta name="twitter:image" content={settings.seo_og_image || settings.logo_url || ''} />
      </Helmet>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
