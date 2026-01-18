import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import ProductCard from '@/components/products/ProductCard';
import { useWishlist } from '@/contexts/WishlistContext';

export default function Wishlist() {
  const { items, loading } = useWishlist();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb items={[{ label: 'Wishlist' }]} className="mb-6" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl mb-8">My Wishlist</h1>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted rounded-lg" />
                  <div className="h-4 bg-muted rounded mt-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-display text-2xl mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">Save items you love to your wishlist</p>
              <Button asChild><Link to="/shop">Start Shopping</Link></Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {items.map((item, i) => (
                <ProductCard key={item.id} product={item.product} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
