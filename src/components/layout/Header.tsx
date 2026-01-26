import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, ShoppingBag, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSiteSettings, MenuItem } from '@/contexts/SiteSettingsContext';
import CartDrawer from '@/components/cart/CartDrawer';

function NavItem({ item, onClick }: { item: MenuItem; onClick?: () => void }) {
  if (item.type === 'external') {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
        onClick={onClick}
      >
        {item.label}
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
      </a>
    );
  }

  return (
    <Link
      to={item.url}
      className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
      onClick={onClick}
    >
      {item.label}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

function MobileNavItem({ item, onClick }: { item: MenuItem; onClick?: () => void }) {
  if (item.type === 'external') {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-display hover:text-primary transition-colors"
        onClick={onClick}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      to={item.url}
      className="text-lg font-display hover:text-primary transition-colors"
      onClick={onClick}
    >
      {item.label}
    </Link>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { settings, loading } = useSiteSettings();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        {/* Announcement bar */}
        {settings.announcement_enabled && (
          <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-body">
            {settings.announcement_text}
          </div>
        )}

        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Mobile menu button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] pt-12">
                <nav className="flex flex-col gap-4">
                  {settings.header_menu.map((item) => (
                    <MobileNavItem
                      key={item.id}
                      item={item}
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link to="/" className="flex items-center">
              {loading ? (
                <div className="h-10 md:h-14 w-28 md:w-40 bg-muted animate-pulse rounded" />
              ) : settings.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt={settings.store_name} 
                  className="h-10 md:h-14 w-auto"
                />
              ) : (
                <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-wide text-foreground">
                  {settings.store_name.toUpperCase()}
                </h1>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {settings.header_menu.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </nav>

            {/* Right side icons */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="hover:bg-accent"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Account */}
              <Link to={user ? '/account' : '/auth'}>
                <Button variant="ghost" size="icon" className="hover:bg-accent">
                  <User className="h-5 w-5" />
                </Button>
              </Link>

              {/* Wishlist */}
              <Link to="/wishlist" className="relative">
                <Button variant="ghost" size="icon" className="hover:bg-accent">
                  <Heart className="h-5 w-5" />
                  {wishlistItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {wishlistItems.length}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-accent"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border overflow-hidden"
            >
              <form onSubmit={handleSearch} className="container mx-auto px-4 py-4">
                <div className="relative max-w-xl mx-auto">
                  <Input
                    type="text"
                    placeholder="Search for products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-secondary border-0 focus-visible:ring-primary"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
