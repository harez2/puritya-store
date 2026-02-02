// Design Mode Definitions and Presets

export type DesignMode = 'generic' | 'modest';

export type BorderRadiusStyle = 'standard' | 'soft' | 'pill';
export type CardShadowStyle = 'minimal' | 'soft' | 'elegant';
export type ButtonStyle = 'standard' | 'rounded' | 'sleek';

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface DesignModePreset {
  id: DesignMode;
  name: string;
  description: string;
  tagline: string;
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
  styles: {
    borderRadius: BorderRadiusStyle;
    cardShadow: CardShadowStyle;
    buttonStyle: ButtonStyle;
  };
}

export const DESIGN_MODE_PRESETS: Record<DesignMode, DesignModePreset> = {
  generic: {
    id: 'generic',
    name: 'Generic Fashion',
    description: 'Modern, minimalist, trend-focused design',
    tagline: 'Bold & Contemporary',
    colors: {
      primary: { h: 12, s: 45, l: 55 },      // Rose Gold
      secondary: { h: 35, s: 35, l: 92 },    // Warm Cream
      accent: { h: 350, s: 35, l: 90 },      // Soft Blush
      background: { h: 30, s: 30, l: 98 },   // Off-White
    },
    fonts: {
      heading: 'Cormorant Garamond',
      body: 'Outfit',
    },
    styles: {
      borderRadius: 'standard',
      cardShadow: 'minimal',
      buttonStyle: 'standard',
    },
  },
  modest: {
    id: 'modest',
    name: 'Modest Fashion',
    description: 'Premium, sleek design with luxurious elegance',
    tagline: 'Luxe & Refined',
    colors: {
      primary: { h: 25, s: 30, l: 25 },      // Deep Espresso Brown
      secondary: { h: 35, s: 20, l: 95 },    // Pearl White
      accent: { h: 38, s: 45, l: 65 },       // Champagne Gold
      background: { h: 40, s: 15, l: 97 },   // Soft Ivory
    },
    fonts: {
      heading: 'Cormorant',
      body: 'Raleway',
    },
    styles: {
      borderRadius: 'soft',
      cardShadow: 'elegant',
      buttonStyle: 'sleek',
    },
  },
};

// Get CSS variable values for border radius based on style
export function getBorderRadiusValue(style: BorderRadiusStyle): string {
  switch (style) {
    case 'standard':
      return '0.5rem';   // rounded-lg
    case 'soft':
      return '0.25rem';  // rounded - more refined/sleek
    case 'pill':
      return '9999px';   // rounded-full
    default:
      return '0.5rem';
  }
}

// Get CSS variable values for button border radius based on style
export function getButtonRadiusValue(style: ButtonStyle): string {
  switch (style) {
    case 'standard':
      return '0.375rem'; // rounded-md
    case 'rounded':
      return '9999px';   // rounded-full / pill
    case 'sleek':
      return '0.125rem'; // rounded-sm - sharp, premium look
    default:
      return '0.375rem';
  }
}

// Get CSS class for card shadow based on style
export function getCardShadowClass(style: CardShadowStyle): string {
  switch (style) {
    case 'minimal':
      return 'shadow-sm hover:shadow-lg';
    case 'soft':
      return 'shadow-md hover:shadow-xl';
    case 'elegant':
      return 'shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]';
    default:
      return 'shadow-sm hover:shadow-lg';
  }
}

// Helper to check if design mode is valid
export function isValidDesignMode(mode: string): mode is DesignMode {
  return mode === 'generic' || mode === 'modest';
}

// Get preset by mode
export function getDesignModePreset(mode: DesignMode): DesignModePreset {
  return DESIGN_MODE_PRESETS[mode];
}
