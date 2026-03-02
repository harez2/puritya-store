import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Heart, Minus, Plus, ShoppingBag, Zap, ChevronDown, ChevronUp, Share2, Copy, Check } from 'lucide-react';
import { getShareUrl } from '@/lib/og-share';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb, { type BreadcrumbItemType } from '@/components/layout/PageBreadcrumb';
import ProductCard from '@/components/products/ProductCard';
import ProductReviews from '@/components/products/ProductReviews';
import QuickCheckoutModal from '@/components/checkout/QuickCheckoutModal';
import { supabase, Product } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { formatPrice, cn } from '@/lib/utils';
import { trackViewItem, trackViewItemList, DataLayerProduct } from '@/lib/data-layer';
import { trackFacebookEvent, FacebookEvents } from '@/lib/facebook-pixel';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { recentlyViewed, addProduct: addToRecentlyViewed, refresh: refreshRecentlyViewed } = useRecentlyViewed();
  const { settings } = useSiteSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [showQuickCheckout, setShowQuickCheckout] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [copied, setCopied] = useState(false);

  // Must call useMemo before any early returns to follow Rules of Hooks
  const breadcrumbItems = useMemo((): BreadcrumbItemType[] => {
    if (!product) return [{ label: 'Shop', href: '/shop' }];
    const items: BreadcrumbItemType[] = [{ label: 'Shop', href: '/shop' }];
    if (product.category) {
      items.push({ label: product.category.name, href: `/shop?category=${product.category.slug}` });
    }
    items.push({ label: product.name });
    return items;
  }, [product]);

  useEffect(() => {
    async function fetchProduct() {
      if (!slug) return;
      try {
        const { data } = await supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('slug', slug)
          .maybeSingle();
        setProduct(data);
        if (data?.sizes?.length) setSelectedSize(data.sizes[0]);
        if (data?.colors?.length) setSelectedColor(data.colors[0]);
        
        // Track view_item in data layer
        if (data) {
          const dataLayerProduct: DataLayerProduct = {
            item_id: data.id,
            item_name: data.name,
            price: Number(data.price),
            item_category: data.category?.name,
          };
          trackViewItem(dataLayerProduct, 'BDT');
          
          // Track ViewContent in Facebook Pixel with content_ids for catalog matching
          if (settings.facebook_pixel_id) {
            trackFacebookEvent(
              settings.facebook_pixel_id,
              settings.facebook_capi_enabled,
              FacebookEvents.ViewContent,
              {
                content_ids: [data.id],
                content_name: data.name,
                content_type: 'product',
                content_category: data.category?.name,
                value: Number(data.price),
                currency: 'BDT',
              }
            );
          }
        }
        
        // Add to recently viewed
        if (data?.id) {
          addToRecentlyViewed(data.id);
          refreshRecentlyViewed();
        }
        
        // Fetch related products from same category
        if (data?.category_id) {
          const { data: related } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('category_id', data.category_id)
            .neq('id', data.id)
            .limit(4);
          setRelatedProducts(related || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [slug, addToRecentlyViewed, refreshRecentlyViewed]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    await addToCart(product.id, quantity, selectedSize || undefined, selectedColor || undefined);
    setAddingToCart(false);
  };

  const handleBuyNow = () => {
    if (!product) return;
    setShowQuickCheckout(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse grid md:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-muted rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl mb-4">Product Not Found</h1>
          <Button asChild><Link to="/shop">Back to Shop</Link></Button>
        </div>
      </Layout>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > 0 && Number(product.compare_at_price) < Number(product.price);
  const displayPrice = hasDiscount ? Number(product.compare_at_price) : Number(product.price);
  const originalPrice = hasDiscount ? Number(product.price) : null;
  const discount = hasDiscount
    ? Math.round(((Number(product.price) - Number(product.compare_at_price)) / Number(product.price)) * 100)
    : 0;

  // Strip HTML for fallback meta description
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Get meta description with fallbacks
  const metaDescription = product.meta_description || 
    (product.short_description ? stripHtml(product.short_description).substring(0, 160) : '') ||
    (product.description ? stripHtml(product.description).substring(0, 160) : '');

  // JSON-LD structured data for Google rich snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": metaDescription || product.name,
    "image": product.images || [],
    "sku": product.id,
    "brand": {
      "@type": "Brand",
      "name": settings.store_name || "Store"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "BDT",
      "price": Number(product.price),
      "availability": product.in_stock 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      ...(product.compare_at_price && {
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
    },
    ...(product.category && {
      "category": product.category.name
    })
  };

  return (
    <Layout>
      <Helmet>
        <title>{product.name} | {settings.store_name}</title>
        {metaDescription && <meta name="description" content={metaDescription} />}
        <meta property="og:title" content={product.name} />
        {metaDescription && <meta property="og:description" content={metaDescription} />}
        {product.images?.[0] && <meta property="og:image" content={product.images[0]} />}
        <meta property="og:type" content="product" />
        <meta property="product:price:amount" content={String(product.price)} />
        <meta property="product:price:currency" content="BDT" />
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb items={breadcrumbItems} className="mb-8" />

        <div className="grid md:grid-cols-2 gap-12">
          {/* Images */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="aspect-[3/4] bg-secondary rounded-lg overflow-hidden mb-4">
              {product.images?.[selectedImage] ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-20 w-20 text-muted-foreground" />
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "w-20 h-24 rounded-md overflow-hidden border-2 transition-colors",
                      selectedImage === i ? "border-primary" : "border-transparent"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex gap-2 mb-4">
              {product.new_arrival && <Badge>New Arrival</Badge>}
              {discount > 0 && <Badge variant="destructive">-{discount}%</Badge>}
            </div>

            <h1 className="font-display text-3xl md:text-4xl mb-4">{product.name}</h1>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-2xl font-semibold">{formatPrice(displayPrice)}</span>
              {originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>

            {/* Short Description */}
            {product.short_description && (
              <div 
                className="text-muted-foreground mb-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            )}

            {/* Long Description - Expandable */}
            {product.description && (
              <div className="mb-8">
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-3"
                >
                  {showFullDescription ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide Full Description
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      View Full Description
                    </>
                  )}
                </button>
                {showFullDescription && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="prose prose-sm max-w-none border-t pt-4"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                )}
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <label className="block font-medium mb-3">Size</label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "px-4 py-2 border rounded-md transition-colors",
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <label className="block font-medium mb-3">Color: {selectedColor}</label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "px-4 py-2 border rounded-md transition-colors",
                        selectedColor === color
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <label className="block font-medium mb-3">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-md">
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center">{quantity}</span>
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1"
                  variant="outline"
                  disabled={!product.in_stock || addingToCart}
                  onClick={handleAddToCart}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  {addingToCart ? 'Adding...' : product.in_stock ? 'Add to Cart' : 'Sold Out'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => toggleWishlist(product.id)}
                  className={isWishlisted ? "text-primary" : ""}
                >
                  <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
                </Button>
              </div>
              <Button
                size="lg"
                className="w-full"
                disabled={!product.in_stock}
                onClick={handleBuyNow}
              >
                <Zap className="h-5 w-5 mr-2" />
                Buy Now
              </Button>
            </div>

            {/* Quick Checkout Modal */}
            <QuickCheckoutModal
              open={showQuickCheckout}
              onOpenChange={setShowQuickCheckout}
              product={product}
              quantity={quantity}
              size={selectedSize || undefined}
              color={selectedColor || undefined}
            />

            {/* Share & Shipping Info */}
            <div className="mt-8 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const shareUrl = getShareUrl(`/product/${product.slug}`);
                    const text = encodeURIComponent(product.name);
                    const url = encodeURIComponent(shareUrl);
                    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
                  }}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const shareUrl = getShareUrl(`/product/${product.slug}`);
                    const text = encodeURIComponent(product.name);
                    const url = encodeURIComponent(shareUrl);
                    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
                  }}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    const shareUrl = getShareUrl(`/product/${product.slug}`);
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="p-4 bg-secondary rounded-lg text-sm">
                <p className="text-muted-foreground">
                  🚚 Free delivery on orders over ৳5,000 • Cash on Delivery available
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        {/* Product Reviews */}
        <ProductReviews productId={product.id} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct, index) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed Products */}
        {recentlyViewed.filter(p => p.id !== product?.id).length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl mb-8">Recently Viewed</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {recentlyViewed
                .filter(p => p.id !== product?.id)
                .slice(0, 4)
                .map((viewedProduct, index) => (
                  <ProductCard key={viewedProduct.id} product={viewedProduct} index={index} />
                ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
