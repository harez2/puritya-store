

## Plan: Hero Section Admin Enhancements

### What's missing today
1. **Single hero**: Button URLs are hardcoded (`/shop` and `/shop?filter=new`) — no admin fields to customize them. Also no secondary button text/link fields, and no way to toggle badge/subtitle/buttons on/off.
2. **Single hero**: No "image link URL" field — clicking the hero image doesn't navigate anywhere.
3. **Slider slides**: No "image link URL" field — each slide's background image can't link to a page independently of the CTA buttons.

### Changes

#### 1. Extend `SiteSettings` interface (`SiteSettingsContext.tsx`)
Add new fields to single hero settings:
- `hero_cta_link: string` (primary button URL, default `/shop`)
- `hero_secondary_cta_text: string`
- `hero_secondary_cta_link: string`
- `hero_image_link: string` (clicking the hero image navigates here)
- `hero_show_badge: boolean`
- `hero_show_subtitle: boolean`
- `hero_show_cta: boolean`
- `hero_show_secondary_cta: boolean`

Add to `HeroSlide` interface:
- `image_link?: string` (optional URL the entire slide links to when clicked)

Set proper defaults in the settings initialization.

#### 2. Update admin panel — Single Hero section (`AdminCustomization.tsx`)
- Add toggle switches for badge, subtitle, primary CTA, and secondary CTA visibility
- Add input fields for primary button link, secondary button text, secondary button link
- Add an "Image Link URL" input (the URL the hero image/background links to)
- Reorganize into logical groups

#### 3. Update admin panel — Slider slides (`SortableHeroSlide.tsx`)
- Add an "Image Link URL" input field in each slide's desktop settings so admins can set a URL the entire slide links to (separate from the CTA buttons)

#### 4. Update storefront hero rendering (`Index.tsx`)
- Respect the new toggle fields (`hero_show_badge`, `hero_show_subtitle`, etc.)
- Use `hero_cta_link` instead of hardcoded `/shop`
- Use `hero_secondary_cta_text` / `hero_secondary_cta_link` instead of hardcoded "New Arrivals" / `/shop?filter=new`
- If `hero_image_link` is set, wrap the hero section in a clickable link

#### 5. Update slider rendering (`HeroSlider.tsx`)
- If a slide has `image_link` set and no CTA buttons visible, make the entire slide clickable
- If CTA buttons exist alongside `image_link`, make the background image area clickable (excluding the text overlay)

### Technical notes
- All new fields default to current hardcoded values for backward compatibility
- No database changes needed — these are stored in the existing `site_settings` JSON

