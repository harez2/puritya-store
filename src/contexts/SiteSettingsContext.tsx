import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export interface SiteSettings {
  // Branding
  store_name: string;
  store_tagline: string;
  logo_url: string;
  favicon_url: string;

  // Theme Colors
  primary_color: HSLColor;
  secondary_color: HSLColor;
  accent_color: HSLColor;
  background_color: HSLColor;

  // Hero Section
  hero_title: string;
  hero_subtitle: string;
  hero_badge: string;
  hero_cta_text: string;
  hero_image_url: string;

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
}

const defaultSettings: SiteSettings = {
  store_name: 'Puritya',
  store_tagline: 'Curated feminine fashion imported from around the world',
  logo_url: '',
  favicon_url: '',
  primary_color: { h: 12, s: 45, l: 55 },
  secondary_color: { h: 35, s: 35, l: 92 },
  accent_color: { h: 350, s: 35, l: 90 },
  background_color: { h: 30, s: 30, l: 98 },
  hero_title: 'Elevate Your Feminine Style',
  hero_subtitle: 'Discover curated fashion pieces imported from around the world. Timeless elegance for the modern woman.',
  hero_badge: 'New Collection',
  hero_cta_text: 'Shop Now',
  hero_image_url: '',
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
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading) {
      applyTheme(settings);
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
