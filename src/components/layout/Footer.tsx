import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter } from 'lucide-react';

const footerLinks = {
  shop: [
    { name: 'New Arrivals', href: '/shop?filter=new' },
    { name: 'Dresses', href: '/shop?category=dresses' },
    { name: 'Tops & Blouses', href: '/shop?category=tops' },
    { name: 'Accessories', href: '/shop?category=accessories' },
    { name: 'Sale', href: '/shop?filter=sale' },
  ],
  help: [
    { name: 'Contact Us', href: '/contact' },
    { name: 'Shipping Info', href: '/shipping' },
    { name: 'Returns & Exchanges', href: '/returns' },
    { name: 'Size Guide', href: '/size-guide' },
    { name: 'FAQs', href: '/faqs' },
  ],
  about: [
    { name: 'Our Story', href: '/about' },
    { name: 'Sustainability', href: '/sustainability' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <h2 className="text-3xl font-display font-semibold">PURITYA</h2>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Curated feminine fashion imported from around the world. Elevate your style with our carefully selected pieces.
            </p>
            <div className="mb-6">
              <h4 className="font-display text-lg mb-3">Subscribe to our newsletter</h4>
              <form className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-background border-border"
                />
                <Button className="bg-primary hover:bg-primary/90">
                  Subscribe
                </Button>
              </form>
            </div>
            <div className="flex gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-display text-lg mb-4">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Links */}
          <div>
            <h4 className="font-display text-lg mb-4">Help</h4>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h4 className="font-display text-lg mb-4">About</h4>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Puritya. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            puritya.store
          </p>
        </div>
      </div>
    </footer>
  );
}
