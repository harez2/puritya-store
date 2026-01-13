import { useState } from 'react';
import { Check, Plus, Trash2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CustomThemePreset } from '@/contexts/SiteSettingsContext';

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface ThemePreset {
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
  preview: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  isCustom?: boolean;
}

// Helper to convert HSL to hex for preview
const hslToHex = (h: number, s: number, l: number): string => {
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

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Warm, feminine elegance',
    colors: {
      primary: { h: 12, s: 45, l: 55 },
      secondary: { h: 35, s: 35, l: 92 },
      accent: { h: 350, s: 35, l: 90 },
      background: { h: 30, s: 30, l: 98 },
    },
    fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
    preview: { primary: '#c4836d', secondary: '#f5ede4', accent: '#f2d9d9', background: '#fdfcfa' },
  },
  {
    id: 'midnight-luxe',
    name: 'Midnight Luxe',
    description: 'Dark sophistication with gold accents',
    colors: {
      primary: { h: 45, s: 70, l: 50 },
      secondary: { h: 220, s: 20, l: 20 },
      accent: { h: 45, s: 60, l: 85 },
      background: { h: 220, s: 15, l: 12 },
    },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    preview: { primary: '#d4a520', secondary: '#2a2d36', accent: '#f0e4c4', background: '#1a1c22' },
  },
  {
    id: 'soft-sage',
    name: 'Soft Sage',
    description: 'Natural, calming earth tones',
    colors: {
      primary: { h: 140, s: 25, l: 45 },
      secondary: { h: 60, s: 20, l: 92 },
      accent: { h: 30, s: 30, l: 85 },
      background: { h: 60, s: 15, l: 97 },
    },
    fonts: { heading: 'Lora', body: 'Nunito' },
    preview: { primary: '#5a8f6a', secondary: '#f2f0e4', accent: '#e8d9c8', background: '#faf9f5' },
  },
  {
    id: 'blush-minimal',
    name: 'Blush Minimal',
    description: 'Clean and modern with soft pink',
    colors: {
      primary: { h: 350, s: 50, l: 60 },
      secondary: { h: 0, s: 0, l: 96 },
      accent: { h: 350, s: 40, l: 92 },
      background: { h: 0, s: 0, l: 100 },
    },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    preview: { primary: '#d97085', secondary: '#f5f5f5', accent: '#f9e4e8', background: '#ffffff' },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Fresh coastal vibes',
    colors: {
      primary: { h: 195, s: 55, l: 45 },
      secondary: { h: 195, s: 30, l: 92 },
      accent: { h: 40, s: 60, l: 75 },
      background: { h: 195, s: 20, l: 98 },
    },
    fonts: { heading: 'Merriweather', body: 'Open Sans' },
    preview: { primary: '#3494a8', secondary: '#e3f0f3', accent: '#e8c88a', background: '#f8fbfc' },
  },
  {
    id: 'lavender-dreams',
    name: 'Lavender Dreams',
    description: 'Soft purple elegance',
    colors: {
      primary: { h: 270, s: 40, l: 55 },
      secondary: { h: 270, s: 20, l: 94 },
      accent: { h: 320, s: 35, l: 88 },
      background: { h: 270, s: 15, l: 98 },
    },
    fonts: { heading: 'Fraunces', body: 'Quicksand' },
    preview: { primary: '#9470b8', secondary: '#f0edf5', accent: '#f2dce8', background: '#fbfafc' },
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Warm earthy Mediterranean',
    colors: {
      primary: { h: 15, s: 55, l: 50 },
      secondary: { h: 35, s: 40, l: 90 },
      accent: { h: 45, s: 45, l: 80 },
      background: { h: 35, s: 25, l: 96 },
    },
    fonts: { heading: 'Bodoni Moda', body: 'Jost' },
    preview: { primary: '#c66a42', secondary: '#f5e8d8', accent: '#e8d5a8', background: '#f9f6f2' },
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    description: 'Cool, minimalist Scandinavian',
    colors: {
      primary: { h: 210, s: 15, l: 35 },
      secondary: { h: 210, s: 10, l: 94 },
      accent: { h: 180, s: 20, l: 85 },
      background: { h: 210, s: 10, l: 98 },
    },
    fonts: { heading: 'Libre Baskerville', body: 'Work Sans' },
    preview: { primary: '#4c5a68', secondary: '#eef0f2', accent: '#d4e8e8', background: '#f8f9fa' },
  },
];

// Convert custom preset to display preset
export const customToDisplayPreset = (custom: CustomThemePreset): ThemePreset => ({
  id: custom.id,
  name: custom.name,
  description: custom.description,
  colors: custom.colors,
  fonts: custom.fonts,
  preview: {
    primary: hslToHex(custom.colors.primary.h, custom.colors.primary.s, custom.colors.primary.l),
    secondary: hslToHex(custom.colors.secondary.h, custom.colors.secondary.s, custom.colors.secondary.l),
    accent: hslToHex(custom.colors.accent.h, custom.colors.accent.s, custom.colors.accent.l),
    background: hslToHex(custom.colors.background.h, custom.colors.background.s, custom.colors.background.l),
  },
  isCustom: true,
});

interface ThemePresetsProps {
  currentPreset?: string;
  customPresets: CustomThemePreset[];
  currentColors: {
    primary: HSLColor;
    secondary: HSLColor;
    accent: HSLColor;
    background: HSLColor;
  };
  currentFonts: {
    heading: string;
    body: string;
  };
  onApply: (preset: ThemePreset) => void;
  onSaveCustom: (preset: CustomThemePreset) => void;
  onDeleteCustom: (presetId: string) => void;
}

export function ThemePresets({ 
  currentPreset, 
  customPresets,
  currentColors,
  currentFonts,
  onApply, 
  onSaveCustom,
  onDeleteCustom,
}: ThemePresetsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: CustomThemePreset = {
      id: `custom-${Date.now()}`,
      name: presetName.trim(),
      description: presetDescription.trim() || 'Custom theme preset',
      colors: currentColors,
      fonts: currentFonts,
      createdAt: new Date().toISOString(),
    };
    
    onSaveCustom(newPreset);
    setPresetName('');
    setPresetDescription('');
    setIsDialogOpen(false);
  };

  // Combine built-in and custom presets
  const allPresets: ThemePreset[] = [
    ...customPresets.map(customToDisplayPreset),
    ...THEME_PRESETS,
  ];

  return (
    <div className="space-y-6">
      {/* Save Current Theme Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Save your current theme settings as a reusable preset
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Save Current Theme
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Theme Preset</DialogTitle>
              <DialogDescription>
                Save your current color and font settings as a custom preset for later use.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Preview of current theme */}
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-2">Current Theme Preview</p>
                <div className="flex gap-1 mb-2">
                  <div
                    className="flex-1 h-6 rounded-l-md"
                    style={{ backgroundColor: hslToHex(currentColors.primary.h, currentColors.primary.s, currentColors.primary.l) }}
                  />
                  <div
                    className="flex-1 h-6"
                    style={{ backgroundColor: hslToHex(currentColors.secondary.h, currentColors.secondary.s, currentColors.secondary.l) }}
                  />
                  <div
                    className="flex-1 h-6"
                    style={{ backgroundColor: hslToHex(currentColors.accent.h, currentColors.accent.s, currentColors.accent.l) }}
                  />
                  <div
                    className="flex-1 h-6 rounded-r-md border"
                    style={{ backgroundColor: hslToHex(currentColors.background.h, currentColors.background.s, currentColors.background.l) }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentFonts.heading} + {currentFonts.body}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preset-name">Preset Name *</Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., My Brand Theme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preset-description">Description (optional)</Label>
                <Textarea
                  id="preset-description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="e.g., Main brand colors with elegant fonts"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Save Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Custom Presets Section */}
      {customPresets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Your Custom Presets
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {customPresets.map((custom) => {
              const preset = customToDisplayPreset(custom);
              const isActive = currentPreset === preset.id;
              
              return (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={isActive}
                  onApply={() => onApply(preset)}
                  onDelete={() => onDeleteCustom(preset.id)}
                  isCustom
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Built-in Presets Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Built-in Presets</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEME_PRESETS.map((preset) => {
            const isActive = currentPreset === preset.id;
            
            return (
              <PresetCard
                key={preset.id}
                preset={preset}
                isActive={isActive}
                onApply={() => onApply(preset)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Extracted PresetCard component for reuse
interface PresetCardProps {
  preset: ThemePreset;
  isActive: boolean;
  onApply: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
}

function PresetCard({ preset, isActive, onApply, onDelete, isCustom }: PresetCardProps) {
  return (
    <div
      className={`relative rounded-lg border-2 p-3 transition-all cursor-pointer hover:shadow-md group ${
        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
      }`}
      onClick={onApply}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 z-10">
          <Check className="h-3 w-3" />
        </div>
      )}
      
      {isCustom && onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="absolute top-1 right-1 p-1 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Preset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{preset.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {/* Custom badge */}
      {isCustom && (
        <div className="absolute top-1 left-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium">
          Custom
        </div>
      )}
      
      {/* Color Preview */}
      <div className="flex gap-1 mb-3 mt-4">
        <div
          className="flex-1 h-8 rounded-l-md"
          style={{ backgroundColor: preset.preview.primary }}
        />
        <div
          className="flex-1 h-8"
          style={{ backgroundColor: preset.preview.secondary }}
        />
        <div
          className="flex-1 h-8"
          style={{ backgroundColor: preset.preview.accent }}
        />
        <div
          className="flex-1 h-8 rounded-r-md border"
          style={{ backgroundColor: preset.preview.background }}
        />
      </div>
      
      {/* Font Preview */}
      <div
        className="rounded-md p-2 mb-2"
        style={{ backgroundColor: preset.preview.background }}
      >
        <p
          className="text-sm font-medium truncate"
          style={{ 
            fontFamily: `"${preset.fonts.heading}", serif`,
            color: preset.preview.primary
          }}
        >
          {preset.name}
        </p>
        <p
          className="text-xs truncate opacity-70"
          style={{ fontFamily: `"${preset.fonts.body}", sans-serif` }}
        >
          {preset.fonts.heading} + {preset.fonts.body}
        </p>
      </div>
      
      <p className="text-xs text-muted-foreground line-clamp-1">{preset.description}</p>
    </div>
  );
}
