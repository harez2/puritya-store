import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/supabase';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

type ProductCardProps = {
  product: Product;
  index?: number;
};

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const isWishlisted = isInWishlist(product.id);

  const discount = product.compare_at_price
    ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <div 
        className="relative overflow-hidden bg-secondary product-card-hover transition-all duration-500"
        style={{ borderRadius: 'var(--card-radius)' }}
      >
        {/* Image */}
        <Link to={`/product/${product.slug}`} className="block aspect-[3/4] overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.new_arrival && (
            <Badge className="bg-foreground text-background hover:bg-foreground text-[0.65rem] tracking-wider uppercase font-medium">
              New
            </Badge>
          )}
          {discount > 0 && (
            <Badge variant="destructive" className="text-[0.65rem] tracking-wider font-medium">
              -{discount}%
            </Badge>
          )}
          {!product.in_stock && (
            <Badge variant="secondary" className="text-[0.65rem] tracking-wider uppercase font-medium">
              Sold Out
            </Badge>
          )}
        </div>

        {/* Wishlist button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background transition-all duration-300",
            isWishlisted && "text-primary"
          )}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
        >
          <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
        </Button>

        {/* Quick add button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <Button
            className="w-full tracking-wide"
            style={{ borderRadius: 'var(--button-radius)' }}
            disabled={!product.in_stock}
            onClick={(e) => {
              e.preventDefault();
              addToCart(product.id);
            }}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            {product.in_stock ? 'Add to Cart' : 'Sold Out'}
          </Button>
        </motion.div>
      </div>

      {/* Product Info */}
      <Link to={`/product/${product.slug}`} className="block mt-4">
        <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors product-title">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-semibold text-foreground">
            {formatPrice(Number(product.price))}
          </span>
          {product.compare_at_price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(Number(product.compare_at_price))}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
