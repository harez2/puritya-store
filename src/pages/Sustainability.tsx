import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { Leaf, Recycle, Package, Heart } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export default function Sustainability() {
  const { settings } = useSiteSettings();

  return (
    <Layout>
      <Helmet>
        <title>Sustainability | {settings.store_name}</title>
        <meta name="description" content={`Learn about ${settings.store_name}'s commitment to sustainability and ethical fashion practices.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Our Commitment to Sustainability
          </h1>
          <p className="text-muted-foreground text-center mb-12 text-lg">
            Fashion that respects both people and planet.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-secondary/50 rounded-xl p-6">
              <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">Conscious Sourcing</h3>
              <p className="text-muted-foreground">
                We partner with suppliers who share our values. We prioritize working with manufacturers that maintain ethical labor practices and use sustainable materials wherever possible.
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-6">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Recycle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">Reduced Waste</h3>
              <p className="text-muted-foreground">
                We're working to minimize waste in our operations. From reducing packaging materials to encouraging customers to recycle, every step counts toward a greener future.
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-6">
              <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">Eco-Friendly Packaging</h3>
              <p className="text-muted-foreground">
                We're transitioning to recyclable and biodegradable packaging materials. Our goal is to eliminate single-use plastics from our supply chain entirely.
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-6">
              <div className="bg-pink-100 dark:bg-pink-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">Quality Over Quantity</h3>
              <p className="text-muted-foreground">
                We believe in investing in pieces that last. By offering high-quality items, we encourage a more mindful approach to fashion that reduces overconsumption.
              </p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="font-display">Our Journey</h2>
            <p>
              Sustainability is a journey, not a destination. We acknowledge that we're not perfect, but we're committed to continuous improvement. We regularly review our practices and look for new ways to reduce our environmental impact.
            </p>

            <h2 className="font-display">What You Can Do</h2>
            <p>
              As a customer, you play a vital role in sustainable fashion:
            </p>
            <ul>
              <li>Choose quality pieces that will last for years</li>
              <li>Care for your clothes properly to extend their life</li>
              <li>Donate or recycle items you no longer wear</li>
              <li>Support brands that prioritize sustainability</li>
            </ul>

            <h2 className="font-display">Looking Forward</h2>
            <p>
              We're excited about the future and the positive changes we can make together. We believe that fashion can be both beautiful and responsible. Thank you for being part of our sustainability journey.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
