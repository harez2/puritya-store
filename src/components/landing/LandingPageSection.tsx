import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Star, Shield, Zap, Truck, Heart, Check, ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/products/ProductCard';
import QuickCheckoutModal from '@/components/checkout/QuickCheckoutModal';
import { formatPrice } from '@/lib/utils';
import { Product } from '@/lib/supabase';

interface SectionProps {
  section: {
    id: string;
    type: string;
    content: Record<string, any>;
  };
  onSectionClick?: (sectionId: string) => void;
  onCheckout?: (productId: string) => void;
}

const ICONS: Record<string, React.ElementType> = {
  star: Star,
  shield: Shield,
  zap: Zap,
  truck: Truck,
  heart: Heart,
  check: Check,
};

export function LandingPageSection({ section, onSectionClick, onCheckout }: SectionProps) {
  const { type, content } = section;

  const handleClick = () => {
    onSectionClick?.(section.id);
  };

  switch (type) {
    case 'hero':
      return <HeroSection content={content} sectionId={section.id} onClick={handleClick} />;
    case 'text':
      return <TextSection content={content} />;
    case 'features':
      return <FeaturesSection content={content} />;
    case 'testimonials':
      return <TestimonialsSection content={content} />;
    case 'cta':
      return <CTASection content={content} sectionId={section.id} onClick={handleClick} />;
    case 'products':
      return <ProductsSection content={content} onCheckout={onCheckout} />;
    case 'image':
      return <ImageSection content={content} />;
    default:
      return null;
  }
}

function HeroSection({ content, sectionId, onClick }: { content: any; sectionId?: string; onClick?: () => void }) {
  const backgroundStyle = content.backgroundImage
    ? { backgroundImage: `url(${content.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: content.backgroundColor || '#1a1a2e' };

  return (
    <section
      className="relative min-h-[70vh] flex items-center justify-center py-20 px-4"
      style={backgroundStyle}
    >
      {content.backgroundImage && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      <div className="relative z-10 max-w-4xl mx-auto text-center" style={{ color: content.textColor || '#ffffff' }}>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          {content.headline}
        </h1>
        {content.subheadline && (
          <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-2xl mx-auto">
            {content.subheadline}
          </p>
        )}
        {content.ctaText && (
          <Button asChild size="lg" className="text-lg px-8 py-6" onClick={onClick}>
            <Link to={content.ctaLink || '/shop'}>{content.ctaText}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function TextSection({ content }: { content: any }) {
  return (
    <section className="py-16 px-4">
      <div 
        className={`max-w-4xl mx-auto prose prose-lg dark:prose-invert text-${content.alignment || 'center'}`}
        dangerouslySetInnerHTML={{ __html: content.content || '' }}
      />
    </section>
  );
}

function FeaturesSection({ content }: { content: any }) {
  const features = content.features || [];

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {content.headline && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {content.headline}
          </h2>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature: any, index: number) => {
            const Icon = ICONS[feature.icon] || Star;
            return (
              <div key={index} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ content }: { content: any }) {
  const testimonials = content.testimonials || [];

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {content.headline && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {content.headline}
          </h2>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial: any, index: number) => (
            <div key={index} className="bg-card border rounded-xl p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
              <div className="flex items-center gap-3">
                {testimonial.avatar ? (
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-medium">
                      {testimonial.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ content, sectionId, onClick }: { content: any; sectionId?: string; onClick?: () => void }) {
  return (
    <section
      className="py-20 px-4"
      style={{ 
        backgroundColor: content.backgroundColor || '#3b82f6',
        color: content.textColor || '#ffffff'
      }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          {content.headline}
        </h2>
        {content.subheadline && (
          <p className="text-xl opacity-90 mb-8">
            {content.subheadline}
          </p>
        )}
        {content.ctaText && (
          <Button 
            asChild 
            size="lg" 
            variant="secondary"
            className="text-lg px-8"
            onClick={onClick}
          >
            <Link to={content.ctaLink || '/shop'}>{content.ctaText}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function ProductsSection({ content, onCheckout }: { content: any; onCheckout?: (productId: string) => void }) {
  const productIds = content.productIds || [];
  const columns = content.columns || 4;
  const enableQuickCheckout = content.enableQuickCheckout ?? false;
  const buyButtonText = content.buyButtonText || 'Buy Now';
  const showPrices = content.showPrices ?? true;

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickCheckoutOpen, setQuickCheckoutOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['landing-products', productIds],
    queryFn: async () => {
      let query = supabase.from('products').select('*, categories(name, slug)');
      
      if (productIds.length > 0) {
        query = query.in('id', productIds);
      } else {
        query = query.eq('featured', true).limit(columns);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';

  const handleBuyNow = (product: Product) => {
    setSelectedProduct(product);
    setQuickCheckoutOpen(true);
    onCheckout?.(product.id);
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {content.headline && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {content.headline}
          </h2>
        )}
        {enableQuickCheckout ? (
          <div className={`grid grid-cols-2 ${gridCols} gap-6`}>
            {products.map((product: any) => (
              <LandingProductCard 
                key={product.id} 
                product={product} 
                showPrice={showPrices}
                buyButtonText={buyButtonText}
                onBuyNow={() => handleBuyNow(product)}
              />
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-2 ${gridCols} gap-6`}>
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <QuickCheckoutModal
          open={quickCheckoutOpen}
          onOpenChange={setQuickCheckoutOpen}
          product={selectedProduct}
          quantity={1}
        />
      )}
    </section>
  );
}

// Custom product card for landing pages with quick checkout
function LandingProductCard({ 
  product, 
  showPrice, 
  buyButtonText, 
  onBuyNow 
}: { 
  product: Product; 
  showPrice: boolean;
  buyButtonText: string;
  onBuyNow: () => void;
}) {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  return (
    <div className="group bg-card border rounded-xl overflow-hidden transition-shadow hover:shadow-lg">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-square overflow-hidden relative">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded">
              -{discountPercent}%
            </span>
          )}
          {!product.in_stock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>
      
      <div className="p-4 space-y-3">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {showPrice && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price!)}
              </span>
            )}
          </div>
        )}
        
        <Button 
          onClick={onBuyNow}
          disabled={!product.in_stock}
          className="w-full"
          size="sm"
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          {buyButtonText}
        </Button>
      </div>
    </div>
  );
}

function ImageSection({ content }: { content: any }) {
  if (!content.imageUrl) return null;

  return (
    <section className={content.fullWidth ? '' : 'py-16 px-4'}>
      <div className={content.fullWidth ? '' : 'max-w-6xl mx-auto'}>
        <img
          src={content.imageUrl}
          alt={content.alt || ''}
          className="w-full h-auto"
        />
        {content.caption && (
          <p className="text-center text-muted-foreground mt-4 px-4">
            {content.caption}
          </p>
        )}
      </div>
    </section>
  );
}
