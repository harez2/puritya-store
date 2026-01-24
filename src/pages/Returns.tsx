import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export default function Returns() {
  const { settings } = useSiteSettings();

  return (
    <Layout>
      <Helmet>
        <title>Returns & Exchanges | {settings.store_name}</title>
        <meta name="description" content={`Learn about ${settings.store_name}'s return and exchange policy. Easy returns within 7 days of delivery.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Returns & Exchanges
          </h1>
          <p className="text-muted-foreground text-center mb-12">
            We want you to love your purchase. If something isn't right, we're here to help.
          </p>

          <div className="bg-secondary/50 rounded-xl p-6 mb-12 flex items-center gap-4">
            <RefreshCw className="h-10 w-10 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-display font-semibold text-lg">7-Day Return Policy</h3>
              <p className="text-muted-foreground">Return or exchange items within 7 days of delivery</p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="font-display">Return Eligibility</h2>
            <div className="grid sm:grid-cols-2 gap-4 not-prose mb-8">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-800 dark:text-green-400">Eligible for Return</h4>
                </div>
                <ul className="text-sm space-y-2 text-green-700 dark:text-green-300">
                  <li>• Unworn items with original tags</li>
                  <li>• Items in original packaging</li>
                  <li>• Defective or damaged products</li>
                  <li>• Wrong item received</li>
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-semibold text-red-800 dark:text-red-400">Not Eligible</h4>
                </div>
                <ul className="text-sm space-y-2 text-red-700 dark:text-red-300">
                  <li>• Worn or washed items</li>
                  <li>• Items without original tags</li>
                  <li>• Sale or clearance items</li>
                  <li>• Intimate apparel & accessories</li>
                </ul>
              </div>
            </div>

            <h2 className="font-display">How to Return</h2>
            <ol>
              <li><strong>Contact Us:</strong> Reach out to our customer service team within 7 days of receiving your order.</li>
              <li><strong>Get Approval:</strong> We'll review your request and provide return instructions if approved.</li>
              <li><strong>Ship the Item:</strong> Pack the item securely with all original tags and packaging.</li>
              <li><strong>Receive Refund:</strong> Once we receive and inspect the item, we'll process your refund within 5-7 business days.</li>
            </ol>

            <h2 className="font-display">Exchanges</h2>
            <p>
              Want a different size or color? We're happy to help! Contact us to arrange an exchange. Exchange requests are subject to product availability.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 not-prose mt-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-400 mb-1">Important Note</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Return shipping costs are the responsibility of the customer unless the item is defective or we made an error.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="font-display">Refund Process</h2>
            <p>
              Refunds will be processed to the original payment method. For Cash on Delivery orders, refunds will be sent via bKash or Nagad.
            </p>
            <ul>
              <li>Refund processing time: 5-7 business days after item inspection</li>
              <li>Bank transfers may take an additional 3-5 business days</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
