import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FontOption {
  name: string;
  family: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
}

// Curated list of popular Google Fonts
export const GOOGLE_FONTS: FontOption[] = [
  // Serif fonts (great for headings)
  { name: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', category: 'serif' },
  { name: 'Playfair Display', family: '"Playfair Display", serif', category: 'serif' },
  { name: 'Lora', family: '"Lora", serif', category: 'serif' },
  { name: 'Merriweather', family: '"Merriweather", serif', category: 'serif' },
  { name: 'Crimson Text', family: '"Crimson Text", serif', category: 'serif' },
  { name: 'EB Garamond', family: '"EB Garamond", serif', category: 'serif' },
  { name: 'Libre Baskerville', family: '"Libre Baskerville", serif', category: 'serif' },
  { name: 'Source Serif Pro', family: '"Source Serif Pro", serif', category: 'serif' },
  { name: 'DM Serif Display', family: '"DM Serif Display", serif', category: 'serif' },
  { name: 'Fraunces', family: '"Fraunces", serif', category: 'serif' },
  
  // Display fonts (elegant headings)
  { name: 'Abril Fatface', family: '"Abril Fatface", display', category: 'display' },
  { name: 'Bodoni Moda', family: '"Bodoni Moda", serif', category: 'display' },
  { name: 'Yeseva One', family: '"Yeseva One", display', category: 'display' },
  
  // Sans-serif fonts (great for body text)
  { name: 'Outfit', family: '"Outfit", sans-serif', category: 'sans-serif' },
  { name: 'Inter', family: '"Inter", sans-serif', category: 'sans-serif' },
  { name: 'Poppins', family: '"Poppins", sans-serif', category: 'sans-serif' },
  { name: 'Montserrat', family: '"Montserrat", sans-serif', category: 'sans-serif' },
  { name: 'Open Sans', family: '"Open Sans", sans-serif', category: 'sans-serif' },
  { name: 'Lato', family: '"Lato", sans-serif', category: 'sans-serif' },
  { name: 'Nunito', family: '"Nunito", sans-serif', category: 'sans-serif' },
  { name: 'Raleway', family: '"Raleway", sans-serif', category: 'sans-serif' },
  { name: 'Work Sans', family: '"Work Sans", sans-serif', category: 'sans-serif' },
  { name: 'DM Sans', family: '"DM Sans", sans-serif', category: 'sans-serif' },
  { name: 'Quicksand', family: '"Quicksand", sans-serif', category: 'sans-serif' },
  { name: 'Rubik', family: '"Rubik", sans-serif', category: 'sans-serif' },
  { name: 'Jost', family: '"Jost", sans-serif', category: 'sans-serif' },
  { name: 'Manrope', family: '"Manrope", sans-serif', category: 'sans-serif' },
  { name: 'Plus Jakarta Sans', family: '"Plus Jakarta Sans", sans-serif', category: 'sans-serif' },
  
  // Handwriting fonts (for accents)
  { name: 'Dancing Script', family: '"Dancing Script", cursive', category: 'handwriting' },
  { name: 'Pacifico', family: '"Pacifico", cursive', category: 'handwriting' },
  { name: 'Great Vibes', family: '"Great Vibes", cursive', category: 'handwriting' },
];

interface FontSelectorProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  category?: 'all' | 'headings' | 'body';
}

export function FontSelector({ label, description, value, onChange, category = 'all' }: FontSelectorProps) {
  // Filter fonts based on category
  const filteredFonts = GOOGLE_FONTS.filter((font) => {
    if (category === 'all') return true;
    if (category === 'headings') return ['serif', 'display', 'handwriting'].includes(font.category);
    if (category === 'body') return ['sans-serif', 'serif'].includes(font.category);
    return true;
  });

  // Group fonts by category
  const groupedFonts = filteredFonts.reduce((acc, font) => {
    if (!acc[font.category]) acc[font.category] = [];
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontOption[]>);

  const categoryLabels: Record<string, string> = {
    serif: 'Serif',
    'sans-serif': 'Sans Serif',
    display: 'Display',
    handwriting: 'Handwriting',
    monospace: 'Monospace',
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a font">
            <span style={{ fontFamily: GOOGLE_FONTS.find(f => f.name === value)?.family }}>
              {value}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {Object.entries(groupedFonts).map(([cat, fonts]) => (
            <div key={cat}>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                {categoryLabels[cat] || cat}
              </div>
              {fonts.map((font) => (
                <SelectItem
                  key={font.name}
                  value={font.name}
                  className="cursor-pointer"
                >
                  <span style={{ fontFamily: font.family }}>{font.name}</span>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Utility to generate Google Fonts URL
export function generateGoogleFontsUrl(headingFont: string, bodyFont: string): string {
  const fonts = new Set([headingFont, bodyFont]);
  const fontParams = Array.from(fonts)
    .map((font) => {
      const formatted = font.replace(/ /g, '+');
      // Include various weights
      if (['Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather'].includes(font)) {
        return `family=${formatted}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500`;
      }
      return `family=${formatted}:wght@300;400;500;600;700`;
    })
    .join('&');
  
  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
}
