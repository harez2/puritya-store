import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export default function Privacy() {
  const { settings } = useSiteSettings();

  return (
    <Layout>
      <Helmet>
        <title>Privacy Policy | {settings.store_name}</title>
        <meta name="description" content={`${settings.store_name}'s privacy policy. Learn how we collect, use, and protect your personal information.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-center mb-12">
            Last updated: January 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <p>
              At {settings.store_name}, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase.
            </p>

            <h2 className="font-display">Information We Collect</h2>
            <h3>Personal Information</h3>
            <p>We may collect personal information that you voluntarily provide when you:</p>
            <ul>
              <li>Create an account</li>
              <li>Place an order</li>
              <li>Subscribe to our newsletter</li>
              <li>Contact our customer service</li>
              <li>Participate in promotions or surveys</li>
            </ul>
            <p>This information may include your name, email address, phone number, shipping address, and payment information.</p>

            <h3>Automatically Collected Information</h3>
            <p>When you visit our website, we may automatically collect:</p>
            <ul>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>IP address</li>
              <li>Pages visited and time spent</li>
              <li>Referring website</li>
            </ul>

            <h2 className="font-display">How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Process and fulfill your orders</li>
              <li>Send order confirmations and updates</li>
              <li>Respond to customer service requests</li>
              <li>Send promotional emails (with your consent)</li>
              <li>Improve our website and services</li>
              <li>Prevent fraud and enhance security</li>
            </ul>

            <h2 className="font-display">Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information with:
            </p>
            <ul>
              <li><strong>Service Providers:</strong> Companies that help us with shipping, payment processing, and marketing</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>

            <h2 className="font-display">Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="font-display">Cookies</h2>
            <p>
              We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie settings through your browser preferences.
            </p>

            <h2 className="font-display">Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access and receive a copy of your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2 className="font-display">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              Email: privacy@{settings.store_name.toLowerCase()}.com<br />
              Or visit our <a href="/contact">Contact page</a>
            </p>

            <h2 className="font-display">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
