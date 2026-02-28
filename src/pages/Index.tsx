import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import { HeroSlider } from '@/components/HeroSlider';
import { HomepageSection } from '@/components/home/HomepageSection';
import { supabase } from '@/lib/supabase';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import heroImage from '@/assets/hero-image.jpg';
import categoryDresses from '@/assets/category-dresses.jpg';
import categoryAccessories from '@/assets/category-accessories.jpg';
import categoryTops from '@/assets/category-tops.jpg';

const iconMap: Record<string, React.ElementType> = {
  truck: Truck,
  'refresh-cw': RefreshCw,
  shield: Shield,
};

const categories = [
  { name: 'Dresses', slug: 'dresses', image: categoryDresses },
  { name: 'Accessories', slug: 'accessories', image: categoryAccessories },
  { name: 'Tops & Blouses', slug: 'tops', image: categoryTops },
];

export default function Index() {
  const { settings, loading: settingsLoading } = useSiteSettings();

  const heroImageUrl = settings.hero_image_url || heroImage;
  const useSlider = settings.hero_slider?.enabled && settings.hero_slider?.slides?.length > 0;

  // Get enabled sections sorted by display_order
  const enabledSections = [...(settings.homepage_sections || [])]
    .filter((s) => s.enabled)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <Layout>
      {/* Hero Section */}
      {settings.hero_enabled !== false && (settingsLoading ? (
        <section className="relative h-[80vh] min-h-[600px] bg-muted animate-pulse" />
      ) : useSlider ? (
        <HeroSlider
          slides={settings.hero_slider.slides}
          autoplay={settings.hero_slider.autoplay}
          autoplayDelay={settings.hero_slider.autoplay_delay}
          storeName={settings.store_name}
        />
      ) : (
        <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
          <img
            src={heroImageUrl}
            alt={settings.store_name}
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
                {settings.hero_badge}
              </span>
              <h1 className="font-display text-5xl md:text-7xl mt-4 mb-6 leading-tight">
                {settings.hero_title.split(' ').map((word, i, arr) => (
                  <span key={i}>
                    {i === Math.floor(arr.length / 2) ? (
                      <span className="text-primary">{word}</span>
                    ) : (
                      word
                    )}
                    {i < arr.length - 1 && ' '}
                    {i === Math.floor(arr.length / 2) && <br />}
                  </span>
                ))}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-md">
                {settings.hero_subtitle}
              </p>
              <div className="flex gap-4">
                <Button size="lg" asChild>
                  <Link to="/shop">
                    {settings.hero_cta_text} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/shop?filter=new">New Arrivals</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* Features */}
      {settings.features_enabled && settings.features.length > 0 && (
        <section className="py-12 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {settings.features.map((feature, i) => {
                const IconComponent = iconMap[feature.icon] || Truck;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4 justify-center"
                  >
                    <IconComponent className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {settings.categories_enabled !== false && (
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
      )}

      {/* Dynamic Homepage Sections */}
      {enabledSections.map((section) => (
        <HomepageSection key={section.id} section={section} />
      ))}

      {/* CTA Banner */}
      {settings.cta_enabled !== false && (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-2xl p-12 md:p-20 text-center text-primary-foreground">
            <h2 className="font-display text-3xl md:text-5xl mb-4">{settings.cta_title}</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              {settings.cta_subtitle}
            </p>
            <Button variant="secondary" size="lg" asChild>
              <Link to="/auth">{settings.cta_button_text}</Link>
            </Button>
          </div>
        </div>
      </section>
      )}
    </Layout>
  );
}
