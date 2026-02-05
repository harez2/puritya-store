import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DesignMode, 
  BorderRadiusStyle, 
  CardShadowStyle, 
  ButtonStyle,
  getBorderRadiusValue,
  getButtonRadiusValue,
} from '@/lib/design-modes';

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  type: 'internal' | 'external';
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
  freeShippingThreshold?: number;
  discountThreshold?: number;
  discountAmount?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cod' | 'bkash' | 'nagad' | 'card' | 'sslcommerz' | 'bkash_gateway' | 'other';
  enabled: boolean;
  instructions?: string;
  accountNumber?: string;
  isDefault?: boolean;
}

export interface PaymentGatewayConfig {
  // bKash Gateway
  bkash_enabled: boolean;
  bkash_sandbox: boolean;
  bkash_app_key: string;
  bkash_app_secret: string;
  bkash_is_default: boolean;

  // SSLCommerz Gateway
  sslcommerz_enabled: boolean;
  sslcommerz_sandbox: boolean;
  sslcommerz_store_id: string;
  sslcommerz_store_password: string;
  sslcommerz_is_default: boolean;

  // UddoktaPay Gateway
  uddoktapay_enabled: boolean;
  uddoktapay_sandbox: boolean;
  uddoktapay_base_url: string;
  uddoktapay_api_key: string;
  uddoktapay_is_default: boolean;
}

export interface HeroSlide {
  id: string;
  image_url: string;
  badge: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  secondary_cta_text: string;
  secondary_cta_link: string;
  // Mobile-specific overrides
  mobile_image_url?: string;
  mobile_title?: string;
  mobile_subtitle?: string;
  mobile_badge?: string;
  hide_on_mobile?: boolean;
}

export interface HeroSliderSettings {
  enabled: boolean;
  autoplay: boolean;
  autoplay_delay: number; // in seconds
  slides: HeroSlide[];
}

export interface SectionSettings {
  limit?: number;
  columns?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
  background?: 'default' | 'secondary' | 'accent';
  // Custom section content settings
  contentType?: 'products_category' | 'reviews' | 'blogs_category';
  categoryId?: string;
  blogCategoryId?: string;
}

export interface HomepageSection {
  id: string;
  type: 'new_in' | 'on_sale' | 'featured' | 'blogs' | 'reviews' | 'custom';
  title: string;
  subtitle?: string;
  enabled: boolean;
  display_order: number;
  settings?: SectionSettings;
}

export interface SiteSettings {
  // Design Mode
  design_mode: DesignMode;
  border_radius_style: BorderRadiusStyle;
  card_shadow_style: CardShadowStyle;
  button_style: ButtonStyle;

  // Branding
  store_name: string;
  store_tagline: string;
  logo_url: string;
  logo_size: number; // 32 to 80px (height)
  favicon_url: string;

  // Typography
  heading_font: string;
  body_font: string;
  heading_size_scale: number; // 0.8 to 1.4 multiplier
  body_font_size: number; // 14 to 20px

  // Theme Colors
  primary_color: HSLColor;
  secondary_color: HSLColor;
  accent_color: HSLColor;
  background_color: HSLColor;

  // Hero Section (single image fallback)
  hero_title: string;
  hero_subtitle: string;
  hero_badge: string;
  hero_cta_text: string;
  hero_image_url: string;

  // Hero Slider
  hero_slider: HeroSliderSettings;

  // Announcement Bar
  announcement_text: string;
  announcement_enabled: boolean;

  // CTA Banner
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;

  // Footer
  footer_description: string;
  copyright_text: string;
  footer_tagline: string;

  // Social Links
  social_instagram: string;
  social_facebook: string;
  social_twitter: string;

  // Features
  features: Feature[];

  // Menus
  header_menu: MenuItem[];
  footer_shop_menu: MenuItem[];
  footer_help_menu: MenuItem[];
  footer_about_menu: MenuItem[];

  // Custom CSS
  custom_css: string;

  // Custom Scripts
  custom_head_scripts: string;
  custom_body_scripts: string;

  // Custom Theme Presets
  custom_presets: CustomThemePreset[];

  // Facebook Pixel & Conversion API
  facebook_pixel_id: string;
  facebook_capi_enabled: boolean;
  // Note: facebook_access_token is now stored securely server-side only

  // Facebook Catalog
  facebook_catalog_id: string;
  facebook_catalog_enabled: boolean;

  // Google Tag Manager
  gtm_container_id: string;
  gtm_enabled: boolean;

  // Shipping Options
  shipping_options: ShippingOption[];

  // Payment Methods
  payment_methods: PaymentMethod[];

  // Payment Gateways
  payment_gateways: PaymentGatewayConfig;

  // Blocked Customer Settings
  blocked_message: string;
  blocking_enabled: boolean;

  // Order Tracking Settings
  order_tracking_enabled: boolean;

  // Guest Checkout Settings
  guest_checkout_enabled: boolean;

  // Order Number Settings
  order_number_prefix: string;
  order_number_use_domain: boolean;

  // Global SEO Settings
  seo_title_template: string;
  seo_default_description: string;
  seo_default_keywords: string;
  seo_og_image: string;
  seo_twitter_handle: string;
  seo_robots_index: boolean;
  seo_robots_follow: boolean;

  // Homepage Sections
  homepage_sections: HomepageSection[];
}

export interface CustomThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: HSLColor;
    secondary: HSLColor;
    accent: HSLColor;
    background: HSLColor;
  };
  fonts: {
    heading: string;
    body: string;
  };
  createdAt: string;
}

const defaultSettings: SiteSettings = {
  // Design Mode defaults
  design_mode: 'generic',
  border_radius_style: 'standard',
  card_shadow_style: 'minimal',
  button_style: 'standard',
  
  store_name: 'Puritya',
  store_tagline: 'Curated feminine fashion imported from around the world',
  logo_url: '',
  logo_size: 56, // default 56px height
  favicon_url: '',
  heading_font: 'Cormorant Garamond',
  body_font: 'Outfit',
  heading_size_scale: 1,
  body_font_size: 16,
  primary_color: { h: 12, s: 45, l: 55 },
  secondary_color: { h: 35, s: 35, l: 92 },
  accent_color: { h: 350, s: 35, l: 90 },
  background_color: { h: 30, s: 30, l: 98 },
  hero_title: 'Elevate Your Feminine Style',
  hero_subtitle: 'Discover curated fashion pieces imported from around the world. Timeless elegance for the modern woman.',
  hero_badge: 'New Collection',
  hero_cta_text: 'Shop Now',
  hero_image_url: '',
  hero_slider: {
    enabled: false,
    autoplay: true,
    autoplay_delay: 5,
    slides: [],
  },
  announcement_text: 'Free shipping on orders over ₦50,000 | Use code PURITYA10 for 10% off',
  announcement_enabled: true,
  cta_title: 'Join the Puritya Family',
  cta_subtitle: 'Subscribe for exclusive access to new arrivals, special offers, and styling tips.',
  cta_button_text: 'Create Account',
  footer_description: 'Curated feminine fashion imported from around the world. Elevate your style with our carefully selected pieces.',
  copyright_text: '© 2025 Puritya. All rights reserved.',
  footer_tagline: 'puritya.store • Shipping across Bangladesh 🇧🇩',
  social_instagram: '',
  social_facebook: '',
  social_twitter: '',
  features: [
    { icon: 'truck', title: 'Free Delivery', desc: 'On orders over ৳5,000' },
    { icon: 'refresh-cw', title: 'Easy Returns', desc: '7-day return policy' },
    { icon: 'shield', title: 'Secure Payment', desc: 'bKash, Nagad & Cards accepted' },
  ],
  header_menu: [
    { id: '1', label: 'New Arrivals', url: '/shop?filter=new', type: 'internal' },
    { id: '2', label: 'Shop All', url: '/shop', type: 'internal' },
    { id: '3', label: 'Dresses', url: '/shop?category=dresses', type: 'internal' },
    { id: '4', label: 'Tops', url: '/shop?category=tops', type: 'internal' },
    { id: '5', label: 'Accessories', url: '/shop?category=accessories', type: 'internal' },
  ],
  footer_shop_menu: [
    { id: '1', label: 'New Arrivals', url: '/shop?filter=new', type: 'internal' },
    { id: '2', label: 'Dresses', url: '/shop?category=dresses', type: 'internal' },
    { id: '3', label: 'Tops & Blouses', url: '/shop?category=tops', type: 'internal' },
    { id: '4', label: 'Accessories', url: '/shop?category=accessories', type: 'internal' },
    { id: '5', label: 'Sale', url: '/shop?filter=sale', type: 'internal' },
  ],
  footer_help_menu: [
    { id: '1', label: 'Contact Us', url: '/contact', type: 'internal' },
    { id: '2', label: 'Shipping Info', url: '/shipping', type: 'internal' },
    { id: '3', label: 'Returns & Exchanges', url: '/returns', type: 'internal' },
    { id: '4', label: 'Size Guide', url: '/size-guide', type: 'internal' },
    { id: '5', label: 'FAQs', url: '/faqs', type: 'internal' },
  ],
  footer_about_menu: [
    { id: '1', label: 'Our Story', url: '/about', type: 'internal' },
    { id: '2', label: 'Sustainability', url: '/sustainability', type: 'internal' },
    { id: '3', label: 'Privacy Policy', url: '/privacy', type: 'internal' },
    { id: '4', label: 'Terms of Service', url: '/terms', type: 'internal' },
  ],
  custom_css: '',
  custom_head_scripts: '',
  custom_body_scripts: '',
  custom_presets: [],
  facebook_pixel_id: '',
  facebook_capi_enabled: false,
  facebook_catalog_id: '',
  facebook_catalog_enabled: false,
  gtm_container_id: '',
  gtm_enabled: false,
  shipping_options: [
    { id: '1', name: 'Inside Dhaka', price: 60, enabled: true },
    { id: '2', name: 'Outside Dhaka', price: 120, enabled: true },
  ],
  payment_methods: [
    { id: 'cod', name: 'Cash on Delivery', type: 'cod', enabled: true, isDefault: true },
    { id: 'bkash', name: 'bKash', type: 'bkash', enabled: true, accountNumber: '' },
    { id: 'nagad', name: 'Nagad', type: 'nagad', enabled: true, accountNumber: '' },
  ],
  // Payment Gateways Configuration
  payment_gateways: {
    bkash_enabled: false,
    bkash_sandbox: true,
    bkash_app_key: '',
    bkash_app_secret: '',
    bkash_is_default: false,
    sslcommerz_enabled: false,
    sslcommerz_sandbox: true,
    sslcommerz_store_id: '',
    sslcommerz_store_password: '',
    sslcommerz_is_default: false,
    uddoktapay_enabled: false,
    uddoktapay_sandbox: true,
    uddoktapay_base_url: '',
    uddoktapay_api_key: '',
    uddoktapay_is_default: false,
  },
  // Blocked Customer Settings
  blocked_message: "We're unable to process your order. Please contact support for assistance.",
  blocking_enabled: true,
  // Order Tracking Settings
  order_tracking_enabled: true,
  // Guest Checkout Settings
  guest_checkout_enabled: true,
  // Order Number Settings
  order_number_prefix: 'ORD',
  order_number_use_domain: true,
  // Global SEO defaults
  seo_title_template: '{page} | {store}',
  seo_default_description: '',
  seo_default_keywords: '',
  seo_og_image: '',
  seo_twitter_handle: '',
  seo_robots_index: true,
  seo_robots_follow: true,
  // Homepage Sections defaults
  homepage_sections: [
    {
      id: 'new_in',
      type: 'new_in',
      title: 'New Arrivals',
      subtitle: 'The latest additions to our collection',
      enabled: true,
      display_order: 0,
      settings: { limit: 4, columns: 4, showViewAll: true, background: 'default' },
    },
    {
      id: 'on_sale',
      type: 'on_sale',
      title: 'On Sale',
      subtitle: 'Great deals on selected items',
      enabled: true,
      display_order: 1,
      settings: { limit: 4, columns: 4, showViewAll: true, background: 'secondary' },
    },
    {
      id: 'featured',
      type: 'featured',
      title: 'Featured Collection',
      subtitle: 'Our most loved pieces',
      enabled: true,
      display_order: 2,
      settings: { limit: 4, columns: 4, showViewAll: true, background: 'default' },
    },
    {
      id: 'blogs',
      type: 'blogs',
      title: 'From Our Blog',
      subtitle: 'Latest news and style inspiration',
      enabled: true,
      display_order: 3,
      settings: { limit: 3, showViewAll: true, background: 'default' },
    },
  ],
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  updateSetting: (key: keyof SiteSettings, value: any) => Promise<void>;
  updateSettings: (updates: Partial<SiteSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      if (data) {
        const settingsMap: Record<string, unknown> = {};
        data.forEach((row) => {
          settingsMap[row.key] = row.value;
        });
        setSettings({ ...defaultSettings, ...settingsMap } as SiteSettings);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (currentSettings: SiteSettings) => {
    const root = document.documentElement;
    
    // Store admin-safe colors (always rose-gold for admin panels)
    root.style.setProperty('--admin-primary', '12 45% 55%');
    root.style.setProperty('--admin-primary-foreground', '30 30% 98%');
    
    // Apply primary color
    root.style.setProperty('--primary', `${currentSettings.primary_color.h} ${currentSettings.primary_color.s}% ${currentSettings.primary_color.l}%`);
    
    // Apply secondary color
    root.style.setProperty('--secondary', `${currentSettings.secondary_color.h} ${currentSettings.secondary_color.s}% ${currentSettings.secondary_color.l}%`);
    
    // Apply accent color
    root.style.setProperty('--accent', `${currentSettings.accent_color.h} ${currentSettings.accent_color.s}% ${currentSettings.accent_color.l}%`);
    
    // Apply background color
    root.style.setProperty('--background', `${currentSettings.background_color.h} ${currentSettings.background_color.s}% ${currentSettings.background_color.l}%`);
    
    // Also update ring to match primary
    root.style.setProperty('--ring', `${currentSettings.primary_color.h} ${currentSettings.primary_color.s}% ${currentSettings.primary_color.l}%`);

    // Apply fonts
    const headingFont = currentSettings.heading_font || 'Cormorant Garamond';
    const bodyFont = currentSettings.body_font || 'Outfit';
    
    // Update CSS custom properties for fonts
    root.style.setProperty('--font-heading', `"${headingFont}", serif`);
    root.style.setProperty('--font-body', `"${bodyFont}", sans-serif`);

    // Apply font sizes
    const headingScale = currentSettings.heading_size_scale || 1;
    const bodySize = currentSettings.body_font_size || 16;
    
    root.style.setProperty('--heading-scale', String(headingScale));
    root.style.setProperty('--body-font-size', `${bodySize}px`);
    
    // Load Google Fonts dynamically
    loadGoogleFonts(headingFont, bodyFont);

    // Apply design mode style variables
    const borderRadius = currentSettings.border_radius_style || 'standard';
    const buttonStyle = currentSettings.button_style || 'standard';
    const cardShadow = currentSettings.card_shadow_style || 'minimal';
    
    root.style.setProperty('--card-radius', getBorderRadiusValue(borderRadius));
    root.style.setProperty('--button-radius', getButtonRadiusValue(buttonStyle));
    root.style.setProperty('--design-mode', currentSettings.design_mode || 'generic');
    
    // Set a data attribute for CSS-based styling
    root.setAttribute('data-design-mode', currentSettings.design_mode || 'generic');
    root.setAttribute('data-card-shadow', cardShadow);
    root.setAttribute('data-border-style', borderRadius);
    root.setAttribute('data-button-style', buttonStyle);

    // Apply custom CSS
    applyCustomCss(currentSettings.custom_css || '');

    // Apply custom scripts
    applyCustomScripts(currentSettings.custom_head_scripts || '', currentSettings.custom_body_scripts || '');
  };

  const loadGoogleFonts = (headingFont: string, bodyFont: string) => {
    const fonts = new Set([headingFont, bodyFont]);
    const fontParams = Array.from(fonts)
      .map((font) => {
        const formatted = font.replace(/ /g, '+');
        if (['Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Crimson Text', 'EB Garamond', 'Libre Baskerville', 'Source Serif Pro', 'DM Serif Display', 'Fraunces', 'Abril Fatface', 'Bodoni Moda', 'Yeseva One'].includes(font)) {
          return `family=${formatted}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500`;
        }
        return `family=${formatted}:wght@300;400;500;600;700`;
      })
      .join('&');
    
    const fontUrl = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
    
    // Check if font link already exists
    const existingLink = document.querySelector(`link[href^="https://fonts.googleapis.com/css2?family="]`);
    if (existingLink) {
      existingLink.setAttribute('href', fontUrl);
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  };

  const applyCustomCss = (css: string) => {
    const styleId = 'custom-site-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
  };

  const applyCustomScripts = (headScripts: string, bodyScripts: string) => {
    // Apply head scripts
    const headScriptId = 'custom-head-scripts';
    let headScriptContainer = document.getElementById(headScriptId);
    
    if (headScriptContainer) {
      headScriptContainer.remove();
    }
    
    if (headScripts.trim()) {
      headScriptContainer = document.createElement('div');
      headScriptContainer.id = headScriptId;
      headScriptContainer.innerHTML = headScripts;
      
      // Execute scripts in head
      const scripts = headScriptContainer.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        document.head.appendChild(newScript);
      });
      
      // Append non-script elements to head
      Array.from(headScriptContainer.children).forEach((child) => {
        if (child.tagName !== 'SCRIPT') {
          document.head.appendChild(child.cloneNode(true));
        }
      });
    }

    // Apply body scripts
    const bodyScriptId = 'custom-body-scripts';
    let bodyScriptContainer = document.getElementById(bodyScriptId);
    
    if (bodyScriptContainer) {
      bodyScriptContainer.remove();
    }
    
    if (bodyScripts.trim()) {
      bodyScriptContainer = document.createElement('div');
      bodyScriptContainer.id = bodyScriptId;
      bodyScriptContainer.style.display = 'none';
      bodyScriptContainer.innerHTML = bodyScripts;
      
      // Execute scripts in body
      const scripts = bodyScriptContainer.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading) {
      applyTheme(settings);
      
      // Update document title dynamically
      document.title = settings.store_name || 'Store';
      
      // Update favicon dynamically
      const faviconUrl = settings.favicon_url;
      if (faviconUrl) {
        let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!faviconLink) {
          faviconLink = document.createElement('link');
          faviconLink.rel = 'icon';
          document.head.appendChild(faviconLink);
        }
        faviconLink.href = faviconUrl;
        faviconLink.type = faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      }
      
      // Update OG meta tags dynamically
      const updateMetaTag = (selector: string, attribute: string, value: string) => {
        let meta = document.querySelector(selector) as HTMLMetaElement;
        if (!meta && value) {
          meta = document.createElement('meta');
          const [attrName, attrValue] = selector.match(/\[([^=]+)="([^"]+)"\]/)?.slice(1) || [];
          if (attrName && attrValue) {
            meta.setAttribute(attrName, attrValue);
          }
          document.head.appendChild(meta);
        }
        if (meta && value) {
          meta.setAttribute(attribute, value);
        }
      };
      
      // Update OG and Twitter image tags
      if (settings.seo_og_image) {
        updateMetaTag('meta[property="og:image"]', 'content', settings.seo_og_image);
        updateMetaTag('meta[name="twitter:image"]', 'content', settings.seo_og_image);
      }
      
      // Update OG title and description
      const storeName = settings.store_name || 'Store';
      const storeDescription = settings.seo_default_description || settings.store_tagline || '';
      
      updateMetaTag('meta[property="og:title"]', 'content', storeName);
      updateMetaTag('meta[name="twitter:title"]', 'content', storeName);
      updateMetaTag('meta[property="og:description"]', 'content', storeDescription);
      updateMetaTag('meta[name="twitter:description"]', 'content', storeDescription);
      updateMetaTag('meta[name="description"]', 'content', storeDescription);
      
      // Update Twitter handle if set
      if (settings.seo_twitter_handle) {
        updateMetaTag('meta[name="twitter:site"]', 'content', settings.seo_twitter_handle);
      }
    }
  }, [settings, loading]);

  const updateSetting = async (key: keyof SiteSettings, value: any) => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const updateSettings = async (updates: Partial<SiteSettings>) => {
    try {
      const upserts = Object.entries(updates).map(([key, value]) => ({
        key,
        value: JSON.parse(JSON.stringify(value)),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(upserts, { onConflict: 'key' });

      if (error) throw error;

      setSettings((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    setLoading(true);
    await fetchSettings();
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, updateSetting, updateSettings, refreshSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}
