import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, RotateCcw, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useSiteSettings, SiteSettings, CustomThemePreset } from '@/contexts/SiteSettingsContext';
import { useToast } from '@/hooks/use-toast';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';
import { MenuEditor } from '@/components/admin/MenuEditor';
import { FontSelector } from '@/components/admin/FontSelector';
import { CustomCssEditor } from '@/components/admin/CustomCssEditor';
import { CustomScriptsEditor } from '@/components/admin/CustomScriptsEditor';
import { ThemePresets, ThemePreset, THEME_PRESETS } from '@/components/admin/ThemePresets';
import { FacebookPixelSetup } from '@/components/admin/FacebookPixelSetup';
import { GoogleTagManagerSetup } from '@/components/admin/GoogleTagManagerSetup';
import { HeroSlideEditor } from '@/components/admin/HeroSlideEditor';
import { HomepageSectionsEditor } from '@/components/admin/HomepageSectionsEditor';
import { DesignModeSelector } from '@/components/admin/DesignModeSelector';
import { DesignMode, DESIGN_MODE_PRESETS } from '@/lib/design-modes';

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

// Section title mapping for header display
const SECTION_TITLES: Record<string, string> = {
  'design-mode': 'Design Mode',
  'branding': 'Branding',
  'typography': 'Fonts',
  'theme': 'Theme',
  'menus': 'Menus',
  'hero': 'Hero',
  'homepage': 'Homepage',
  'sections': 'Sections',
  'footer': 'Footer',
  'custom-css': 'Custom CSS',
  'scripts': 'Scripts',
  'facebook': 'Facebook Pixel',
  'gtm': 'Google Tag Manager',
  'seo': 'SEO',
};

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: HSLColor;
  onChange: (value: HSLColor) => void;
}) {
  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexToHsl = (hex: string): HSLColor => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return value;
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex gap-3 items-center">
        <input
          type="color"
          value={hslToHex(value.h, value.s, value.l)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-12 h-12 rounded-md border border-input cursor-pointer"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">H</span>
            <Slider
              value={[value.h]}
              max={360}
              step={1}
              onValueChange={([h]) => onChange({ ...value, h })}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">{value.h}°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">S</span>
            <Slider
              value={[value.s]}
              max={100}
              step={1}
              onValueChange={([s]) => onChange({ ...value, s })}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">{value.s}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">L</span>
            <Slider
              value={[value.l]}
              max={100}
              step={1}
              onValueChange={([l]) => onChange({ ...value, l })}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">{value.l}%</span>
          </div>
        </div>
      </div>
      <div
        className="h-8 rounded-md border"
        style={{ backgroundColor: `hsl(${value.h}, ${value.s}%, ${value.l}%)` }}
      />
    </div>
  );
}

export default function AdminCustomization() {
  const [searchParams] = useSearchParams();
  const { settings, loading, updateSettings } = useSiteSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const activeSection = searchParams.get('tab') || 'branding';

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    setHasChanges(JSON.stringify(localSettings) !== JSON.stringify(settings));
  }, [localSettings, settings]);

  const handleChange = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      toast({
        title: 'Settings saved',
        description: 'Your customizations have been applied.',
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  const handleApplyPreset = (preset: ThemePreset) => {
    setLocalSettings((prev) => ({
      ...prev,
      primary_color: preset.colors.primary,
      secondary_color: preset.colors.secondary,
      accent_color: preset.colors.accent,
      background_color: preset.colors.background,
      heading_font: preset.fonts.heading,
      body_font: preset.fonts.body,
    }));
    toast({
      title: 'Preset applied',
      description: `"${preset.name}" theme applied. Save to keep changes.`,
    });
  };

  const handleDesignModeChange = (mode: DesignMode, applyDefaults: boolean) => {
    const preset = DESIGN_MODE_PRESETS[mode];
    
    setLocalSettings((prev) => {
      const updates: Partial<SiteSettings> = {
        design_mode: mode,
        border_radius_style: preset.styles.borderRadius,
        card_shadow_style: preset.styles.cardShadow,
        button_style: preset.styles.buttonStyle,
      };

      if (applyDefaults) {
        updates.primary_color = preset.colors.primary;
        updates.secondary_color = preset.colors.secondary;
        updates.accent_color = preset.colors.accent;
        updates.background_color = preset.colors.background;
        updates.heading_font = preset.fonts.heading;
        updates.body_font = preset.fonts.body;
      }

      return { ...prev, ...updates };
    });

    toast({
      title: 'Design mode changed',
      description: applyDefaults 
        ? `Switched to "${preset.name}" with default colors and fonts.`
        : `Switched to "${preset.name}" while keeping your customizations.`,
    });
  };

  const getCurrentPresetId = (): string | undefined => {
    const customMatch = (localSettings.custom_presets || []).find((preset) => 
      preset.colors.primary.h === localSettings.primary_color.h &&
      preset.colors.primary.s === localSettings.primary_color.s &&
      preset.colors.primary.l === localSettings.primary_color.l &&
      preset.fonts.heading === localSettings.heading_font &&
      preset.fonts.body === localSettings.body_font
    );
    if (customMatch) return customMatch.id;

    return THEME_PRESETS.find((preset) => 
      preset.colors.primary.h === localSettings.primary_color.h &&
      preset.colors.primary.s === localSettings.primary_color.s &&
      preset.colors.primary.l === localSettings.primary_color.l &&
      preset.fonts.heading === localSettings.heading_font &&
      preset.fonts.body === localSettings.body_font
    )?.id;
  };

  const handleSaveCustomPreset = (preset: CustomThemePreset) => {
    const updatedPresets = [...(localSettings.custom_presets || []), preset];
    handleChange('custom_presets', updatedPresets);
    toast({
      title: 'Preset saved',
      description: `"${preset.name}" has been saved. Don't forget to save your changes.`,
    });
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    const updatedPresets = (localSettings.custom_presets || []).filter(p => p.id !== presetId);
    handleChange('custom_presets', updatedPresets);
    toast({
      title: 'Preset deleted',
      description: 'Custom preset has been removed.',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'design-mode':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Design Mode</CardTitle>
              <CardDescription>
                Choose between two distinct visual themes for your store. Each mode comes with its own color palette, fonts, and styling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DesignModeSelector
                currentMode={localSettings.design_mode || 'generic'}
                onModeChange={handleDesignModeChange}
              />
            </CardContent>
          </Card>
        );

      case 'branding':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Store Identity</CardTitle>
                <CardDescription>Configure your store name and logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="store_name">Store Name</Label>
                    <Input
                      id="store_name"
                      value={localSettings.store_name}
                      onChange={(e) => handleChange('store_name', e.target.value)}
                      placeholder="Your store name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store_tagline">Store Tagline</Label>
                    <Input
                      id="store_tagline"
                      value={localSettings.store_tagline}
                      onChange={(e) => handleChange('store_tagline', e.target.value)}
                      placeholder="A catchy tagline"
                    />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <SingleImageUpload
                      image={localSettings.logo_url || null}
                      onImageChange={(url) => handleChange('logo_url', url || '')}
                      folder="branding"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: PNG or SVG with transparent background
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Logo Size</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[localSettings.logo_size || 56]}
                          min={32}
                          max={80}
                          step={4}
                          onValueChange={([size]) => handleChange('logo_size', size)}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-12">{localSettings.logo_size || 56}px</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Height of the logo in the header (32-80px)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Favicon</Label>
                      <SingleImageUpload
                        image={localSettings.favicon_url || null}
                        onImageChange={(url) => handleChange('favicon_url', url || '')}
                        folder="branding"
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: 32x32 or 64x64 PNG
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
                <CardDescription>Connect your social media accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="social_instagram">Instagram URL</Label>
                    <Input
                      id="social_instagram"
                      value={localSettings.social_instagram}
                      onChange={(e) => handleChange('social_instagram', e.target.value)}
                      placeholder="https://instagram.com/yourstore"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="social_facebook">Facebook URL</Label>
                    <Input
                      id="social_facebook"
                      value={localSettings.social_facebook}
                      onChange={(e) => handleChange('social_facebook', e.target.value)}
                      placeholder="https://facebook.com/yourstore"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="social_twitter">Twitter URL</Label>
                    <Input
                      id="social_twitter"
                      value={localSettings.social_twitter}
                      onChange={(e) => handleChange('social_twitter', e.target.value)}
                      placeholder="https://twitter.com/yourstore"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'typography':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Font Selection</CardTitle>
                <CardDescription>Choose fonts for your store from Google Fonts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FontSelector
                    label="Heading Font"
                    description="Used for titles, headings, and display text"
                    value={localSettings.heading_font}
                    onChange={(value) => handleChange('heading_font', value)}
                    category="headings"
                  />
                  <FontSelector
                    label="Body Font"
                    description="Used for paragraphs and general text"
                    value={localSettings.body_font}
                    onChange={(value) => handleChange('body_font', value)}
                    category="body"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Font Sizes</CardTitle>
                <CardDescription>Adjust the size of headings and body text</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Heading Size Scale</Label>
                    <span className="text-sm text-muted-foreground font-mono">
                      {((localSettings.heading_size_scale || 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(localSettings.heading_size_scale || 1) * 100]}
                    min={80}
                    max={140}
                    step={5}
                    onValueChange={([val]) => handleChange('heading_size_scale', val / 100)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller (80%)</span>
                    <span>Default (100%)</span>
                    <span>Larger (140%)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Body Text Size</Label>
                    <span className="text-sm text-muted-foreground font-mono">
                      {localSettings.body_font_size || 16}px
                    </span>
                  </div>
                  <Slider
                    value={[localSettings.body_font_size || 16]}
                    min={14}
                    max={20}
                    step={1}
                    onValueChange={([val]) => handleChange('body_font_size', val)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Small (14px)</span>
                    <span>Default (16px)</span>
                    <span>Large (20px)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Font Preview</CardTitle>
                <CardDescription>See how your fonts and sizes look together</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-6 space-y-4 bg-background">
                  <h2
                    className="font-medium"
                    style={{ 
                      fontFamily: `"${localSettings.heading_font}", serif`,
                      fontSize: `calc(2rem * ${localSettings.heading_size_scale || 1})`
                    }}
                  >
                    {localSettings.store_name || 'Your Store Name'}
                  </h2>
                  <h3
                    style={{ 
                      fontFamily: `"${localSettings.heading_font}", serif`,
                      fontSize: `calc(1.5rem * ${localSettings.heading_size_scale || 1})`
                    }}
                  >
                    Elegant Heading Style
                  </h3>
                  <p
                    className="leading-relaxed"
                    style={{ 
                      fontFamily: `"${localSettings.body_font}", sans-serif`,
                      fontSize: `${localSettings.body_font_size || 16}px`
                    }}
                  >
                    This is how your body text will appear throughout your store. 
                    It should be easy to read and complement your heading font nicely. 
                    Good typography creates a pleasant reading experience for your customers.
                  </p>
                  <div className="flex gap-4 pt-2">
                    <button
                      className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
                      style={{ 
                        fontFamily: `"${localSettings.body_font}", sans-serif`,
                        fontSize: `${localSettings.body_font_size || 16}px`
                      }}
                    >
                      Shop Now
                    </button>
                    <button
                      className="px-4 py-2 rounded-md border border-primary text-primary"
                      style={{ 
                        fontFamily: `"${localSettings.body_font}", sans-serif`,
                        fontSize: `${localSettings.body_font_size || 16}px`
                      }}
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'theme':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Theme Presets</CardTitle>
                <CardDescription>Quick-start with a professionally designed color and font combination</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemePresets
                  currentPreset={getCurrentPresetId()}
                  customPresets={localSettings.custom_presets || []}
                  currentColors={{
                    primary: localSettings.primary_color,
                    secondary: localSettings.secondary_color,
                    accent: localSettings.accent_color,
                    background: localSettings.background_color,
                  }}
                  currentFonts={{
                    heading: localSettings.heading_font,
                    body: localSettings.body_font,
                  }}
                  onApply={handleApplyPreset}
                  onSaveCustom={handleSaveCustomPreset}
                  onDeleteCustom={handleDeleteCustomPreset}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Color Scheme</CardTitle>
                <CardDescription>Fine-tune your store's color palette</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8 md:grid-cols-2">
                <ColorPicker
                  label="Primary Color"
                  value={localSettings.primary_color}
                  onChange={(value) => handleChange('primary_color', value)}
                />
                <ColorPicker
                  label="Secondary Color"
                  value={localSettings.secondary_color}
                  onChange={(value) => handleChange('secondary_color', value)}
                />
                <ColorPicker
                  label="Accent Color"
                  value={localSettings.accent_color}
                  onChange={(value) => handleChange('accent_color', value)}
                />
                <ColorPicker
                  label="Background Color"
                  value={localSettings.background_color}
                  onChange={(value) => handleChange('background_color', value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>See how your colors look together</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-6 space-y-4" style={{ backgroundColor: `hsl(${localSettings.background_color.h}, ${localSettings.background_color.s}%, ${localSettings.background_color.l}%)` }}>
                  <div className="flex gap-2 flex-wrap">
                    <div
                      className="px-4 py-2 rounded-md text-white font-medium"
                      style={{ backgroundColor: `hsl(${localSettings.primary_color.h}, ${localSettings.primary_color.s}%, ${localSettings.primary_color.l}%)` }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-4 py-2 rounded-md font-medium"
                      style={{ backgroundColor: `hsl(${localSettings.secondary_color.h}, ${localSettings.secondary_color.s}%, ${localSettings.secondary_color.l}%)` }}
                    >
                      Secondary
                    </div>
                    <div
                      className="px-4 py-2 rounded-md font-medium"
                      style={{ backgroundColor: `hsl(${localSettings.accent_color.h}, ${localSettings.accent_color.s}%, ${localSettings.accent_color.l}%)` }}
                    >
                      Accent
                    </div>
                  </div>
                  <p 
                    className="text-sm font-medium"
                    style={{ 
                      color: `hsl(${localSettings.primary_color.h}, ${localSettings.primary_color.s}%, ${localSettings.primary_color.l}%)`,
                      fontFamily: `"${localSettings.heading_font}", serif`
                    }}
                  >
                    {localSettings.store_name} — {localSettings.heading_font} + {localSettings.body_font}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'menus':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Header Navigation</CardTitle>
                <CardDescription>Customize the main navigation menu. Drag items to reorder.</CardDescription>
              </CardHeader>
              <CardContent>
                <MenuEditor
                  items={localSettings.header_menu}
                  onChange={(items) => handleChange('header_menu', items)}
                  maxItems={8}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Footer - Shop Links</CardTitle>
                <CardDescription>Links displayed under "Shop" in the footer</CardDescription>
              </CardHeader>
              <CardContent>
                <MenuEditor
                  items={localSettings.footer_shop_menu}
                  onChange={(items) => handleChange('footer_shop_menu', items)}
                  maxItems={6}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Footer - Help Links</CardTitle>
                <CardDescription>Links displayed under "Help" in the footer</CardDescription>
              </CardHeader>
              <CardContent>
                <MenuEditor
                  items={localSettings.footer_help_menu}
                  onChange={(items) => handleChange('footer_help_menu', items)}
                  maxItems={6}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Footer - About Links</CardTitle>
                <CardDescription>Links displayed under "About" in the footer</CardDescription>
              </CardHeader>
              <CardContent>
                <MenuEditor
                  items={localSettings.footer_about_menu}
                  onChange={(items) => handleChange('footer_about_menu', items)}
                  maxItems={6}
                />
              </CardContent>
            </Card>
          </>
        );

      case 'hero':
        return (
          <>
            <HeroSlideEditor
              settings={localSettings.hero_slider}
              onChange={(heroSlider) => handleChange('hero_slider', heroSlider)}
            />

            {!localSettings.hero_slider?.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Single Hero Section</CardTitle>
                  <CardDescription>Customize your homepage hero banner (used when slider is disabled)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="hero_badge">Badge Text</Label>
                    <Input
                      id="hero_badge"
                      value={localSettings.hero_badge}
                      onChange={(e) => handleChange('hero_badge', e.target.value)}
                      placeholder="e.g., New Collection"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_title">Hero Title</Label>
                    <Input
                      id="hero_title"
                      value={localSettings.hero_title}
                      onChange={(e) => handleChange('hero_title', e.target.value)}
                      placeholder="Your main headline"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
                    <Textarea
                      id="hero_subtitle"
                      value={localSettings.hero_subtitle}
                      onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                      placeholder="Supporting text for your headline"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero_cta_text">Button Text</Label>
                    <Input
                      id="hero_cta_text"
                      value={localSettings.hero_cta_text}
                      onChange={(e) => handleChange('hero_cta_text', e.target.value)}
                      placeholder="e.g., Shop Now"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hero Background Image</Label>
                    <SingleImageUpload
                      image={localSettings.hero_image_url || null}
                      onImageChange={(url) => handleChange('hero_image_url', url || '')}
                      folder="hero"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 1920x1080 or larger, high quality image
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );

      case 'homepage':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Announcement Bar</CardTitle>
                <CardDescription>Display a message at the top of your store</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="announcement_enabled">Enable Announcement Bar</Label>
                  <Switch
                    id="announcement_enabled"
                    checked={localSettings.announcement_enabled}
                    onCheckedChange={(checked) => handleChange('announcement_enabled', checked)}
                  />
                </div>
                {localSettings.announcement_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="announcement_text">Announcement Text</Label>
                    <Input
                      id="announcement_text"
                      value={localSettings.announcement_text}
                      onChange={(e) => handleChange('announcement_text', e.target.value)}
                      placeholder="Free shipping on orders over $50!"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call to Action Banner</CardTitle>
                <CardDescription>Customize the CTA section on the homepage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cta_title">CTA Title</Label>
                  <Input
                    id="cta_title"
                    value={localSettings.cta_title}
                    onChange={(e) => handleChange('cta_title', e.target.value)}
                    placeholder="Join Our Community"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta_subtitle">CTA Subtitle</Label>
                  <Textarea
                    id="cta_subtitle"
                    value={localSettings.cta_subtitle}
                    onChange={(e) => handleChange('cta_subtitle', e.target.value)}
                    placeholder="Get exclusive offers and updates"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta_button_text">Button Text</Label>
                  <Input
                    id="cta_button_text"
                    value={localSettings.cta_button_text}
                    onChange={(e) => handleChange('cta_button_text', e.target.value)}
                    placeholder="Sign Up"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'sections':
        return (
          <HomepageSectionsEditor
            sections={localSettings.homepage_sections || []}
            onChange={(sections) => handleChange('homepage_sections', sections)}
          />
        );

      case 'footer':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Footer Content</CardTitle>
              <CardDescription>Customize your store's footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer_description">Footer Description</Label>
                <Textarea
                  id="footer_description"
                  value={localSettings.footer_description}
                  onChange={(e) => handleChange('footer_description', e.target.value)}
                  placeholder="A brief description of your store"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="copyright_text">Copyright Text</Label>
                <Input
                  id="copyright_text"
                  value={localSettings.copyright_text}
                  onChange={(e) => handleChange('copyright_text', e.target.value)}
                  placeholder="© 2025 Your Store. All rights reserved."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_tagline">Footer Tagline</Label>
                <Input
                  id="footer_tagline"
                  value={localSettings.footer_tagline}
                  onChange={(e) => handleChange('footer_tagline', e.target.value)}
                  placeholder="Your slogan or location info"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'custom-css':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Add advanced styling overrides for your store</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomCssEditor
                value={localSettings.custom_css || ''}
                onChange={(value) => handleChange('custom_css', value)}
              />
            </CardContent>
          </Card>
        );

      case 'scripts':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Custom Scripts</CardTitle>
              <CardDescription>Add tracking codes, analytics, chat widgets, and other third-party scripts</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomScriptsEditor
                headScripts={localSettings.custom_head_scripts || ''}
                bodyScripts={localSettings.custom_body_scripts || ''}
                onHeadScriptsChange={(value) => handleChange('custom_head_scripts', value)}
                onBodyScriptsChange={(value) => handleChange('custom_body_scripts', value)}
              />
            </CardContent>
          </Card>
        );

      case 'facebook':
        return (
          <FacebookPixelSetup
            pixelId={localSettings.facebook_pixel_id || ''}
            capiEnabled={localSettings.facebook_capi_enabled || false}
            catalogId={localSettings.facebook_catalog_id || ''}
            catalogEnabled={localSettings.facebook_catalog_enabled || false}
            onPixelIdChange={(value) => handleChange('facebook_pixel_id', value)}
            onCapiEnabledChange={(value) => handleChange('facebook_capi_enabled', value)}
            onCatalogIdChange={(value) => handleChange('facebook_catalog_id', value)}
            onCatalogEnabledChange={(value) => handleChange('facebook_catalog_enabled', value)}
          />
        );

      case 'gtm':
        return (
          <GoogleTagManagerSetup
            containerId={localSettings.gtm_container_id || ''}
            enabled={localSettings.gtm_enabled || false}
            onContainerIdChange={(value) => handleChange('gtm_container_id', value)}
            onEnabledChange={(value) => handleChange('gtm_enabled', value)}
          />
        );

      case 'seo':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Title & Meta Settings</CardTitle>
                <CardDescription>Configure default SEO settings for your store</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="seo_title_template">Title Template</Label>
                  <Input
                    id="seo_title_template"
                    value={localSettings.seo_title_template || '{page} | {store}'}
                    onChange={(e) => handleChange('seo_title_template', e.target.value)}
                    placeholder="{page} | {store}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{page}'} for page title and {'{store}'} for store name. Example: "Products | Puritya"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_default_description">Default Meta Description</Label>
                  <Textarea
                    id="seo_default_description"
                    value={localSettings.seo_default_description || ''}
                    onChange={(e) => handleChange('seo_default_description', e.target.value)}
                    placeholder="A brief description of your store for search engines..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(localSettings.seo_default_description || '').length}/160 characters (recommended max)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_default_keywords">Default Keywords</Label>
                  <Input
                    id="seo_default_keywords"
                    value={localSettings.seo_default_keywords || ''}
                    onChange={(e) => handleChange('seo_default_keywords', e.target.value)}
                    placeholder="fashion, dresses, women's clothing, accessories"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords for your store
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Sharing</CardTitle>
                <CardDescription>Configure how your site appears when shared on social media</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default OG Image</Label>
                  <SingleImageUpload
                    image={localSettings.seo_og_image || null}
                    onImageChange={(url) => handleChange('seo_og_image', url || '')}
                    folder="seo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1200x630px for optimal display on social platforms
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_twitter_handle">Twitter Handle</Label>
                  <Input
                    id="seo_twitter_handle"
                    value={localSettings.seo_twitter_handle || ''}
                    onChange={(e) => handleChange('seo_twitter_handle', e.target.value)}
                    placeholder="@yourstore"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search Engine Indexing</CardTitle>
                <CardDescription>Control how search engines crawl and index your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Search Engine Indexing</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to allow search engines like Google to index your pages
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.seo_robots_index !== false}
                    onCheckedChange={(checked) => handleChange('seo_robots_index', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Link Following</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to allow search engines to follow links on your pages
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.seo_robots_follow !== false}
                    onCheckedChange={(checked) => handleChange('seo_robots_follow', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sitemap & Robots</CardTitle>
                <CardDescription>Your sitemap is automatically generated with all products, blogs, and pages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Sitemap URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value="https://kmbcslfbhpcmxvdsokja.supabase.co/functions/v1/sitemap"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText('https://kmbcslfbhpcmxvdsokja.supabase.co/functions/v1/sitemap');
                        toast({ title: 'Copied!', description: 'Sitemap URL copied to clipboard' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                    >
                      <a href="https://kmbcslfbhpcmxvdsokja.supabase.co/functions/v1/sitemap" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submit this URL to Google Search Console for better indexing
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Robots.txt URL</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value="https://puritya-store.lovable.app/robots.txt"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText('https://puritya-store.lovable.app/robots.txt');
                        toast({ title: 'Copied!', description: 'Robots.txt URL copied to clipboard' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                    >
                      <a href="https://puritya-store.lovable.app/robots.txt" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Sitemap includes:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• All product pages with last modified dates</li>
                        <li>• Published blog posts</li>
                        <li>• Published static pages</li>
                        <li>• Category pages</li>
                        <li>• Core pages (Home, Shop, Blog)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        );

      default:
        return (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Select a section from the sidebar to configure your store.
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{SECTION_TITLES[activeSection] || 'Customization'}</h1>
            <p className="text-muted-foreground">Customize your store's appearance and content</p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard
              </Button>
            )}
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {renderSection()}
        </div>
      </div>
    </AdminLayout>
  );
}
