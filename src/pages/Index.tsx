import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/products/ProductCard';
import { supabase, Product, Category } from '@/lib/supabase';
import heroImage from '@/assets/hero-image.jpg';
import categoryDresses from '@/assets/category-dresses.jpg';
import categoryAccessories from '@/assets/category-accessories.jpg';
import categoryTops from '@/assets/category-tops.jpg';

const features = [
  { icon: Truck, title: 'Free Delivery', desc: 'On orders over ৳5,000' },
  { icon: RefreshCw, title: 'Easy Returns', desc: '7-day return policy' },
  { icon: Shield, title: 'Secure Payment', desc: 'bKash, Nagad & Cards accepted' },
];

const categories = [
  { name: 'Dresses', slug: 'dresses', image: categoryDresses },
  { name: 'Accessories', slug: 'accessories', image: categoryAccessories },
  { name: 'Tops & Blouses', slug: 'tops', image: categoryTops },
];

export default function Index() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const [featuredRes, newRes] = await Promise.all([
          supabase.from('products').select('*').eq('featured', true).limit(4),
          supabase.from('products').select('*').eq('new_arrival', true).limit(4),
        ]);
        setFeaturedProducts(featuredRes.data || []);
        setNewArrivals(newRes.data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
        <img
          src={heroImage}
          alt="Puritya Fashion"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl"
          >
            <span className="text-primary font-medium tracking-widest uppercase text-sm">
              New Collection
            </span>
            <h1 className="font-display text-5xl md:text-7xl mt-4 mb-6 leading-tight">
              Elevate Your <br />
              <span className="text-primary">Feminine</span> Style
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md">
              Discover curated fashion pieces imported from around the world. 
              Timeless elegance for the modern woman.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link to="/shop">
                  Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/shop?filter=new">New Arrivals</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 justify-center"
              >
                <feature.icon className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-4xl mb-4">Shop by Category</h2>
            <p className="text-muted-foreground">Find exactly what you're looking for</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  to={`/shop?category=${cat.slug}`}
                  className="group block relative aspect-[4/5] rounded-lg overflow-hidden"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="font-display text-2xl text-white mb-2">{cat.name}</h3>
                    <span className="text-white/80 text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                      Shop Now <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-20 bg-secondary">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="font-display text-4xl mb-2">Featured Collection</h2>
                <p className="text-muted-foreground">Our most loved pieces</p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/shop">View All</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-2xl p-12 md:p-20 text-center text-primary-foreground">
            <h2 className="font-display text-3xl md:text-5xl mb-4">Join the Puritya Family</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              Subscribe for exclusive access to new arrivals, special offers, and styling tips.
            </p>
            <Button variant="secondary" size="lg" asChild>
              <Link to="/auth">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
