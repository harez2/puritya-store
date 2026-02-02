// Design Mode Definitions and Presets

export type DesignMode = 'generic' | 'modest';

export type BorderRadiusStyle = 'standard' | 'soft' | 'pill';
export type CardShadowStyle = 'minimal' | 'soft';
export type ButtonStyle = 'standard' | 'rounded';

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
    description: 'Elegant, refined design for modest wear',
    tagline: 'Graceful & Refined',
    colors: {
      primary: { h: 160, s: 30, l: 45 },     // Sage Green
      secondary: { h: 45, s: 25, l: 94 },    // Soft Ivory
      accent: { h: 30, s: 35, l: 85 },       // Warm Tan
      background: { h: 40, s: 20, l: 98 },   // Soft Cream
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lora',
    },
    styles: {
      borderRadius: 'soft',
      cardShadow: 'soft',
      buttonStyle: 'rounded',
    },
  },
};

// Get CSS variable values for border radius based on style
export function getBorderRadiusValue(style: BorderRadiusStyle): string {
  switch (style) {
    case 'standard':
      return '0.5rem';   // rounded-lg
    case 'soft':
      return '0.75rem';  // rounded-xl
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
