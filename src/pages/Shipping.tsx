import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { Truck, Package, Clock, MapPin } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export default function Shipping() {
  const { settings } = useSiteSettings();

  return (
    <Layout>
      <Helmet>
        <title>Shipping Information | {settings.store_name}</title>
        <meta name="description" content={`Learn about ${settings.store_name}'s shipping policies, delivery times, and shipping costs across Bangladesh.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Shipping Information
          </h1>
          <p className="text-muted-foreground text-center mb-12">
            Everything you need to know about our shipping and delivery process.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            <div className="bg-secondary/50 rounded-xl p-6 text-center">
              <Truck className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-display font-semibold mb-2">Inside Dhaka</h3>
              <p className="text-2xl font-semibold text-primary mb-1">৳60</p>
              <p className="text-sm text-muted-foreground">1-2 business days</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-6 text-center">
              <Package className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-display font-semibold mb-2">Outside Dhaka</h3>
              <p className="text-2xl font-semibold text-primary mb-1">৳120</p>
              <p className="text-sm text-muted-foreground">3-5 business days</p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="font-display">Delivery Times</h2>
            <p>
              Orders are processed within 24-48 hours of placement. Once your order is shipped, you will receive a confirmation message with tracking information.
            </p>
            <ul>
              <li><strong>Inside Dhaka:</strong> 1-2 business days after dispatch</li>
              <li><strong>Outside Dhaka:</strong> 3-5 business days after dispatch</li>
            </ul>

            <h2 className="font-display">Order Processing</h2>
            <p>
              Orders placed before 2:00 PM on business days are typically processed the same day. Orders placed after 2:00 PM or on holidays will be processed the next business day.
            </p>

            <h2 className="font-display">Tracking Your Order</h2>
            <p>
              Once your order has been shipped, you will receive a tracking number via SMS or email. You can use this number to track your package through our delivery partner's website.
            </p>

            <h2 className="font-display">Delivery Instructions</h2>
            <p>
              Please ensure someone is available to receive the package at the delivery address. If you have specific delivery instructions, please mention them in the order notes during checkout.
            </p>

            <h2 className="font-display">Questions?</h2>
            <p>
              If you have any questions about shipping or your order status, please don't hesitate to contact our customer support team.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
