import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

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

interface ThemePresetsProps {
  currentPreset?: string;
  onApply: (preset: ThemePreset) => void;
}

export function ThemePresets({ currentPreset, onApply }: ThemePresetsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {THEME_PRESETS.map((preset) => {
        const isActive = currentPreset === preset.id;
        
        return (
          <div
            key={preset.id}
            className={`relative rounded-lg border-2 p-3 transition-all cursor-pointer hover:shadow-md ${
              isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onApply(preset)}
          >
            {isActive && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-3 w-3" />
              </div>
            )}
            
            {/* Color Preview */}
            <div className="flex gap-1 mb-3">
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
            
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </div>
        );
      })}
    </div>
  );
}
