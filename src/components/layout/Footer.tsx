import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter } from 'lucide-react';
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
            <div className="flex gap-4">
              {settings.social_instagram && (
                <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings.social_facebook && (
                <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {settings.social_twitter && (
                <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {!settings.social_instagram && !settings.social_facebook && !settings.social_twitter && (
                <>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                </>
              )}
            </div>
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
