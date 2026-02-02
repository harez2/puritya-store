
# Plan: Dual Design System - Generic Fashion & Modest Fashion

## Overview

This plan introduces a **Design Mode** feature that allows you to switch between two distinct visual themes from the admin panel:

1. **Generic Fashion** (Current) - Modern, minimalist, trend-focused design
2. **Modest Fashion** - Elegant, conservative, modest-focused design with softer aesthetics

---

## What Changes

### Visual Differences Between Modes

| Aspect | Generic Fashion | Modest Fashion |
|--------|-----------------|----------------|
| **Color Palette** | Rose Gold, Bold accents | Sage Green, Soft Earth tones |
| **Typography** | Modern serifs + Clean sans | Elegant scripts + Refined serifs |
| **Product Cards** | Minimal, hover effects | Softer borders, subtle shadows |
| **Hero Style** | Bold, full-bleed imagery | Overlaid patterns, softer gradients |
| **Button Style** | Sharp/rounded corners | Pill-shaped, softer appearance |
| **Overall Mood** | Trendy, contemporary | Graceful, refined, modest |

### Admin Panel Addition

A new **"Design Mode"** selector will be added to the Customization page with:
- Visual preview cards showing both design styles
- One-click switching between modes
- Instant preview of changes before saving
- All other customization options (colors, fonts, content) remain fully editable after selecting a mode

---

## How It Works

### 1. Design Mode Setting
- New setting `design_mode` added to site settings (`'generic'` | `'modest'`)
- Stored in the database alongside other customization settings
- Defaults to `'generic'` (current design)

### 2. Design-Specific Presets
Each mode comes with pre-configured defaults:

**Generic Fashion Preset:**
- Colors: Rose Gold primary, Warm cream secondary
- Fonts: Cormorant Garamond + Outfit
- Border radius: Standard (rounded-lg)
- Card style: Minimal with hover effects

**Modest Fashion Preset:**
- Colors: Sage Green primary, Soft cream/ivory secondary
- Fonts: Playfair Display + Lora (or Crimson Text + Nunito)
- Border radius: More rounded (rounded-xl to pill)
- Card style: Soft shadows, subtle borders

### 3. CSS Variables Integration
The existing CSS variable system will be extended with:
```css
--border-radius-style: /* 'standard' | 'soft' | 'pill' */
--card-shadow-style: /* 'minimal' | 'soft' */
--button-style: /* 'standard' | 'rounded' */
```

### 4. Component Adaptations
Key components will read the design mode and apply appropriate styles:
- `ProductCard.tsx` - Different hover effects and shadow styles
- `Header.tsx` - Adjusted spacing and typography weight
- `Footer.tsx` - Layout variations
- `Button` components - Shape variations based on mode
- Hero sections - Different overlay and gradient styles

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/design-modes.ts` | Design mode definitions and presets |
| `src/components/admin/DesignModeSelector.tsx` | Admin UI for switching modes |

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/SiteSettingsContext.tsx` | Add `design_mode` setting with defaults |
| `src/pages/admin/AdminCustomization.tsx` | Add Design Mode tab/section at top |
| `src/index.css` | Add design mode CSS variables and mode-specific classes |
| `src/components/products/ProductCard.tsx` | Apply mode-specific card styles |
| `src/components/layout/Header.tsx` | Mode-aware header styling |
| `src/components/layout/Footer.tsx` | Mode-aware footer styling |
| `src/pages/Index.tsx` | Mode-specific hero and section styling |
| `src/components/ui/button.tsx` | Design mode aware button variants |

### Database Changes
No database schema changes required - uses existing `site_settings` table.

---

## Design Mode Presets

### Generic Fashion (Default)
```typescript
{
  id: 'generic',
  name: 'Generic Fashion',
  description: 'Modern, minimalist, trend-focused design',
  colors: {
    primary: { h: 12, s: 45, l: 55 },      // Rose Gold
    secondary: { h: 35, s: 35, l: 92 },    // Warm Cream
    accent: { h: 350, s: 35, l: 90 },      // Soft Blush
    background: { h: 30, s: 30, l: 98 },   // Off-White
  },
  fonts: { heading: 'Cormorant Garamond', body: 'Outfit' },
  styles: {
    borderRadius: 'standard',   // rounded-lg
    cardShadow: 'minimal',
    buttonStyle: 'standard',
  }
}
```

### Modest Fashion
```typescript
{
  id: 'modest',
  name: 'Modest Fashion',
  description: 'Elegant, refined design for modest wear',
  colors: {
    primary: { h: 160, s: 30, l: 45 },     // Sage Green
    secondary: { h: 45, s: 25, l: 94 },    // Soft Ivory
    accent: { h: 30, s: 35, l: 85 },       // Warm Tan
    background: { h: 40, s: 20, l: 98 },   // Soft Cream
  },
  fonts: { heading: 'Playfair Display', body: 'Lora' },
  styles: {
    borderRadius: 'soft',       // rounded-xl
    cardShadow: 'soft',
    buttonStyle: 'rounded',
  }
}
```

---

## Admin UI Design

### New "Design Mode" Section
Located at the **top of the Customization page** (before Theme tab), featuring:

1. **Large Preview Cards** - Side-by-side visual representation of each mode
2. **Active Indicator** - Clear checkmark on currently selected mode
3. **One-Click Apply** - Clicking a card applies that mode's defaults
4. **Keep Customizations Option** - Toggle to preserve your current color/font customizations when switching

### Preview Card Contents
- Miniature hero section preview
- Sample product card grid
- Button style showcase
- Color palette display

---

## User Experience Flow

1. Admin navigates to **Customization > Design Mode** (new first tab)
2. Views two large preview cards: Generic Fashion vs Modest Fashion
3. Clicks on desired mode
4. System asks: "Apply with default colors/fonts or keep current?"
5. Mode is applied instantly in preview
6. Admin can further customize colors, fonts, content as usual
7. Click "Save Changes" to persist

---

## Summary

This implementation adds a high-level design toggle that dramatically changes the look and feel of your store while preserving all existing customization capabilities. You can switch between a modern generic fashion aesthetic and an elegant modest fashion theme with a single click, then fine-tune as needed.
