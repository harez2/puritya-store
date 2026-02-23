import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter, Youtube, MessageCircle, Send, Linkedin } from 'lucide-react';
import { useSiteSettings, MenuItem } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

function FooterLink({ item }: { item: MenuItem }) {
  if (item.type === 'external') {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      to={item.url}
      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
    >
      {item.label}
    </Link>
  );
}

// TikTok and Pinterest don't have lucide icons, so we use simple SVG icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.21 8.21 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
  </svg>
);

const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0a12 12 0 00-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.36-.72-.36-1.78c0-1.66.96-2.9 2.16-2.9 1.02 0 1.52.77 1.52 1.68 0 1.02-.66 2.56-.99 3.98-.28 1.19.59 2.16 1.76 2.16 2.12 0 3.74-2.24 3.74-5.46 0-2.86-2.04-4.86-4.98-4.86-3.4 0-5.38 2.54-5.38 5.18 0 1.02.4 2.12.88 2.72a.36.36 0 01.08.34c-.09.38-.29 1.18-.33 1.35-.05.22-.18.27-.4.16-1.5-.7-2.44-2.88-2.44-4.64 0-3.78 2.74-7.24 7.92-7.24 4.16 0 7.4 2.96 7.4 6.94 0 4.14-2.6 7.46-6.22 7.46-1.22 0-2.36-.63-2.75-1.38l-.75 2.86c-.27 1.04-1 2.34-1.5 3.14A12 12 0 1012 0z" />
  </svg>
);

export default function Footer() {
  const { settings } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubscribing(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: email.trim().toLowerCase(), source: 'footer' });

      if (error) {
        if (error.code === '23505') {
          toast.info('You are already subscribed!');
        } else {
          throw error;
        }
      } else {
        toast.success('Successfully subscribed to newsletter!');
        setEmail('');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const socialLinks = [
    { key: 'social_instagram', url: settings.social_instagram, icon: Instagram, label: 'Instagram' },
    { key: 'social_facebook', url: settings.social_facebook, icon: Facebook, label: 'Facebook' },
    { key: 'social_twitter', url: settings.social_twitter, icon: Twitter, label: 'Twitter' },
    { key: 'social_youtube', url: settings.social_youtube, icon: Youtube, label: 'YouTube' },
    { key: 'social_tiktok', url: settings.social_tiktok, icon: TikTokIcon, label: 'TikTok' },
    { key: 'social_pinterest', url: settings.social_pinterest, icon: PinterestIcon, label: 'Pinterest' },
    { key: 'social_whatsapp', url: settings.social_whatsapp, icon: MessageCircle, label: 'WhatsApp' },
    { key: 'social_telegram', url: settings.social_telegram, icon: Send, label: 'Telegram' },
    { key: 'social_linkedin', url: settings.social_linkedin, icon: Linkedin, label: 'LinkedIn' },
  ].filter(link => link.url);

  return (
    <footer className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              {(settings.footer_logo_url || settings.logo_url) ? (
                <img 
                  src={settings.footer_logo_url || settings.logo_url} 
                  alt={settings.store_name} 
                  style={{ height: `${settings.footer_logo_size || 40}px` }}
                  className="w-auto"
                />
              ) : (
                <h2 className="text-3xl font-display font-semibold">{settings.store_name.toUpperCase()}</h2>
              )}
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {settings.footer_description}
            </p>
            <div className="mb-6">
              <h4 className="font-display text-lg mb-3">Subscribe to our newsletter</h4>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border"
                  required
                />
                <Button type="submit" disabled={subscribing} className="bg-primary hover:bg-primary/90">
                  {subscribing ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </form>
            </div>
            {settings.show_social_links !== false && socialLinks.length > 0 && (
              <div className="flex gap-4 flex-wrap">
                {socialLinks.map(({ key, url, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop Links */}
          {settings.footer_shop_menu.length > 0 && (
            <div>
              <h4 className="font-display text-lg mb-4">Shop</h4>
              <ul className="space-y-3">
                {settings.footer_shop_menu.map((item) => (
                  <li key={item.id}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Help Links */}
          {settings.footer_help_menu.length > 0 && (
            <div>
              <h4 className="font-display text-lg mb-4">Help</h4>
              <ul className="space-y-3">
                {settings.footer_help_menu.map((item) => (
                  <li key={item.id}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About Links */}
          {settings.footer_about_menu.length > 0 && (
            <div>
              <h4 className="font-display text-lg mb-4">About</h4>
              <ul className="space-y-3">
                {settings.footer_about_menu.map((item) => (
                  <li key={item.id}>
                    <FooterLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {settings.copyright_text}
          </p>
          <p className="text-sm text-muted-foreground">
            {settings.footer_tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
