import { useState, useEffect } from 'react';
import { Palette, Type, Image, Layout, MessageSquare, Save, RotateCcw } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useSiteSettings, SiteSettings } from '@/contexts/SiteSettingsContext';
import { useToast } from '@/hooks/use-toast';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

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
  const { settings, loading, updateSettings } = useSiteSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold">Customization</h1>
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

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger value="hero" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Hero</span>
            </TabsTrigger>
            <TabsTrigger value="homepage" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Homepage</span>
            </TabsTrigger>
            <TabsTrigger value="footer" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Footer</span>
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
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
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Color Scheme</CardTitle>
                <CardDescription>Customize your store's color palette</CardDescription>
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
                  <div className="flex gap-2">
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
                  <p className="text-sm" style={{ color: `hsl(${localSettings.primary_color.h}, ${localSettings.primary_color.s}%, ${localSettings.primary_color.l}%)` }}>
                    This is how text in your primary color will look.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hero Tab */}
          <TabsContent value="hero" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hero Section</CardTitle>
                <CardDescription>Customize your homepage hero banner</CardDescription>
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
          </TabsContent>

          {/* Homepage Tab */}
          <TabsContent value="homepage" className="space-y-6">
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
          </TabsContent>

          {/* Footer Tab */}
          <TabsContent value="footer" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
