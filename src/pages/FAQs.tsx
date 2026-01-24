import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function FAQs() {
  const { settings } = useSiteSettings();

  const faqs = [
    {
      category: 'Orders & Shipping',
      questions: [
        {
          q: 'How long does shipping take?',
          a: 'Orders within Dhaka typically arrive within 1-2 business days. For areas outside Dhaka, delivery takes 3-5 business days. You\'ll receive tracking information once your order ships.',
        },
        {
          q: 'How can I track my order?',
          a: 'Once your order is shipped, you\'ll receive an SMS and/or email with your tracking number. You can use this to track your package through our delivery partner\'s website.',
        },
        {
          q: 'What are the shipping costs?',
          a: 'Shipping inside Dhaka is ৳60, and outside Dhaka is ৳120. We occasionally offer free shipping promotions on orders above a certain amount.',
        },
        {
          q: 'Can I change or cancel my order?',
          a: 'You can modify or cancel your order within 1 hour of placing it. After that, please contact our customer service team and we\'ll do our best to accommodate your request.',
        },
      ],
    },
    {
      category: 'Returns & Exchanges',
      questions: [
        {
          q: 'What is your return policy?',
          a: 'We offer a 7-day return policy. Items must be unworn, unwashed, and have all original tags attached. Please see our Returns page for complete details.',
        },
        {
          q: 'How do I initiate a return?',
          a: 'Contact our customer service team within 7 days of receiving your order. We\'ll provide you with return instructions and a return authorization.',
        },
        {
          q: 'How long do refunds take?',
          a: 'Once we receive and inspect your return, refunds are processed within 5-7 business days. Bank transfers may take an additional 3-5 days to appear in your account.',
        },
      ],
    },
    {
      category: 'Products',
      questions: [
        {
          q: 'How do I find my size?',
          a: 'Check our Size Guide for detailed measurements. If you\'re between sizes, we generally recommend sizing up for a more comfortable fit.',
        },
        {
          q: 'Are your products authentic?',
          a: 'Yes! We source all our products directly from trusted manufacturers and suppliers. Every item is carefully inspected for quality before shipping.',
        },
        {
          q: 'What if an item is out of stock?',
          a: 'Popular items do sell out quickly. You can contact us to inquire about restocking dates, and we may be able to notify you when an item is back in stock.',
        },
      ],
    },
    {
      category: 'Payment',
      questions: [
        {
          q: 'What payment methods do you accept?',
          a: 'We accept Cash on Delivery (COD), bKash, and Nagad. Select your preferred payment method during checkout.',
        },
        {
          q: 'Is Cash on Delivery available everywhere?',
          a: 'Yes, COD is available for all deliveries within Bangladesh. You can pay the delivery person in cash when you receive your order.',
        },
        {
          q: 'How do I pay with bKash or Nagad?',
          a: 'Select bKash or Nagad at checkout, and you\'ll see our payment number. Send the total amount and include your order number in the reference. We\'ll confirm receipt and ship your order.',
        },
      ],
    },
  ];

  return (
    <Layout>
      <Helmet>
        <title>FAQs | {settings.store_name}</title>
        <meta name="description" content={`Frequently asked questions about ${settings.store_name}. Find answers about orders, shipping, returns, and more.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-center mb-12">
            Find quick answers to common questions about shopping with us.
          </p>

          <div className="space-y-8">
            {faqs.map((section) => (
              <div key={section.category}>
                <h2 className="text-xl font-display font-semibold mb-4">{section.category}</h2>
                <Accordion type="single" collapsible className="bg-secondary/30 rounded-xl">
                  {section.questions.map((faq, index) => (
                    <AccordionItem key={index} value={`${section.category}-${index}`} className="border-border/50">
                      <AccordionTrigger className="px-6 hover:no-underline">
                        <span className="text-left">{faq.q}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center bg-secondary/50 rounded-xl p-8">
            <h3 className="font-display text-xl font-semibold mb-2">Still have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Can't find the answer you're looking for? Our customer service team is here to help.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
