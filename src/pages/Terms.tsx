import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export default function Terms() {
  const { settings } = useSiteSettings();

  return (
    <Layout>
      <Helmet>
        <title>Terms of Service | {settings.store_name}</title>
        <meta name="description" content={`${settings.store_name}'s terms of service. Read our terms and conditions for using our website and services.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-center mb-12">
            Last updated: January 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <p>
              Welcome to {settings.store_name}. By accessing or using our website, you agree to be bound by these Terms of Service. Please read them carefully before using our services.
            </p>

            <h2 className="font-display">1. Acceptance of Terms</h2>
            <p>
              By accessing and using this website, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our website.
            </p>

            <h2 className="font-display">2. Use of Website</h2>
            <p>You agree to use our website only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul>
              <li>Use the website in any way that violates applicable laws or regulations</li>
              <li>Attempt to gain unauthorized access to any part of the website</li>
              <li>Use automated systems or software to extract data from the website</li>
              <li>Introduce viruses or other malicious code</li>
              <li>Engage in any activity that interferes with the website's operation</li>
            </ul>

            <h2 className="font-display">3. Account Registration</h2>
            <p>
              When you create an account, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
            </p>

            <h2 className="font-display">4. Products and Pricing</h2>
            <p>
              We strive to display accurate product information and pricing. However, we reserve the right to correct any errors and to change or update information at any time. Prices are subject to change without notice.
            </p>
            <p>
              Product colors may appear slightly different due to monitor settings. We describe products as accurately as possible, but we do not warrant that descriptions are error-free.
            </p>

            <h2 className="font-display">5. Orders and Payment</h2>
            <p>
              By placing an order, you represent that you are authorized to use the payment method provided. We reserve the right to refuse or cancel any order for any reason, including suspected fraud.
            </p>
            <p>
              Order confirmation does not constitute acceptance. We accept your order when we ship the products and send shipping confirmation.
            </p>

            <h2 className="font-display">6. Shipping and Delivery</h2>
            <p>
              Delivery times are estimates only. We are not responsible for delays beyond our control. Risk of loss passes to you upon delivery to the carrier.
            </p>

            <h2 className="font-display">7. Returns and Refunds</h2>
            <p>
              Please refer to our <a href="/returns">Returns & Exchanges</a> page for our complete return policy. All returns are subject to the conditions outlined there.
            </p>

            <h2 className="font-display">8. Intellectual Property</h2>
            <p>
              All content on this website, including text, images, logos, and graphics, is the property of {settings.store_name} and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
            </p>

            <h2 className="font-display">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, {settings.store_name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the website or products purchased.
            </p>

            <h2 className="font-display">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {settings.store_name} and its affiliates from any claims, damages, or expenses arising from your violation of these Terms or your use of the website.
            </p>

            <h2 className="font-display">11. Modifications</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the website constitutes acceptance of the modified Terms.
            </p>

            <h2 className="font-display">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of Bangladesh, without regard to conflict of law principles.
            </p>

            <h2 className="font-display">13. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
            </p>
            <p>
              Email: legal@{settings.store_name.toLowerCase()}.com<br />
              Or visit our <a href="/contact">Contact page</a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
