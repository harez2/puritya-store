import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { Heart, Globe, Sparkles } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export default function About() {
  const { settings } = useSiteSettings();

  return (
    <Layout>
      <Helmet>
        <title>Our Story | {settings.store_name}</title>
        <meta name="description" content={`Learn about ${settings.store_name}'s journey, our mission, and what makes us passionate about bringing you the finest curated fashion.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Our Story
          </h1>
          <p className="text-muted-foreground text-center mb-12 text-lg">
            {settings.store_tagline}
          </p>

          <div className="prose prose-lg max-w-none mb-16">
            <p className="text-lg leading-relaxed">
              Welcome to {settings.store_name}, where we believe that fashion is more than just clothing—it's a form of self-expression that empowers you to feel confident and beautiful every day.
            </p>
            <p>
              Founded with a passion for bringing unique, high-quality fashion to discerning women, we curate pieces from around the world that blend timeless elegance with contemporary style. Every item in our collection is carefully selected to ensure it meets our standards of quality, comfort, and aesthetic appeal.
            </p>
            <p>
              Our journey began with a simple idea: to make beautiful, imported fashion accessible to women who appreciate quality and style without the premium price tag. We work directly with trusted suppliers and manufacturers to bring you pieces that you won't find elsewhere.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Passion for Quality</h3>
              <p className="text-muted-foreground">
                Every piece is hand-selected for its quality, ensuring you receive only the best.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Globally Sourced</h3>
              <p className="text-muted-foreground">
                We bring you unique pieces from fashion capitals around the world.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Timeless Style</h3>
              <p className="text-muted-foreground">
                We focus on pieces that transcend trends and become wardrobe staples.
              </p>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">Our Promise to You</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We are committed to providing you with an exceptional shopping experience. From the moment you browse our collection to the day your order arrives, we strive to exceed your expectations with quality products, responsive customer service, and a seamless experience.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
