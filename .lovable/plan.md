
# Dynamic Homepage Sections Feature

## Overview
This plan introduces a dynamic section management system for the homepage, allowing admins to add, remove, enable/disable, and reorder content sections. We'll start with "New In" and "On Sale" product sections, with the architecture designed to support additional section types (blogs, reviews, custom) in the future.

## Architecture

The system will store homepage section configurations in the site settings (using the existing `site_settings` table and `SiteSettingsContext`), following the same pattern used for hero slides. Each section will have:
- Unique ID
- Section type (e.g., `new_in`, `on_sale`, `featured`, `blogs`, `reviews`, `custom`)
- Enable/disable toggle
- Display order (position)
- Customizable title and subtitle
- Type-specific settings (e.g., product limit, layout columns)

```text
+---------------------------+
|   Homepage Sections       |
+---------------------------+
| - Hero (existing)         |
| - Features (existing)     |
| - Categories (existing)   |
| + Dynamic Sections        | <-- NEW: Reorderable, toggleable
|   - New In                |
|   - On Sale               |
|   - Featured (existing)   |
|   - Blogs (existing)      |
| - CTA Banner (existing)   |
+---------------------------+
```

## Implementation Details

### 1. Update SiteSettingsContext Types
Add new interfaces and default settings for homepage sections:

**File: `src/contexts/SiteSettingsContext.tsx`**
- Add `HomepageSection` interface with properties:
  - `id: string` - Unique identifier
  - `type: string` - Section type (new_in, on_sale, featured, blogs, custom)
  - `title: string` - Display title
  - `subtitle: string` - Optional subtitle
  - `enabled: boolean` - Toggle visibility
  - `display_order: number` - Position ordering
  - `settings: object` - Type-specific settings (limit, columns, background, etc.)
- Add `homepage_sections: HomepageSection[]` to `SiteSettings` interface
- Add default sections for New In and On Sale

### 2. Create Homepage Sections Renderer Component
**New File: `src/components/home/HomepageSection.tsx`**

A component that renders different section types based on configuration:
- `new_in` - Fetches products where `new_arrival = true`
- `on_sale` - Fetches products where `compare_at_price > price` (has discount)
- `featured` - Fetches products where `featured = true`
- `blogs` - Fetches latest published blogs
- `reviews` - Fetches latest approved reviews
- `custom` - Renders custom HTML/text content

Each section will use the existing `ProductCard` component for consistency.

### 3. Update Index Page
**File: `src/pages/Index.tsx`**

Modify the homepage to:
- Import homepage sections from settings
- Filter to only enabled sections
- Sort by display_order
- Render each section using the new `HomepageSection` component
- Replace the hardcoded "Featured Collection" section with dynamic rendering

### 4. Create Admin Sections Editor Component
**New File: `src/components/admin/HomepageSectionsEditor.tsx`**

Features:
- Drag-and-drop reordering using @dnd-kit (following HeroSlideEditor pattern)
- Enable/disable toggle for each section
- Edit section title and subtitle
- Add new sections (dropdown to select type)
- Delete custom sections (built-in sections can only be disabled)
- Type-specific settings editor (product limit, columns, background style)

### 5. Add New Admin Customization Tab
**File: `src/pages/admin/AdminCustomization.tsx`**

- Add new "Sections" tab to the customization page
- Integrate the HomepageSectionsEditor component
- Add tab to SECTION_TITLES mapping

### 6. Update Admin Sidebar
**File: `src/components/admin/AdminSidebar.tsx`**

- Add "Sections" entry to customizationSubItems array with appropriate icon

## Default Section Configuration

The system will include these default sections:

| Section | Type | Default State | Description |
|---------|------|---------------|-------------|
| New In | new_in | Enabled | Products marked as new_arrival |
| On Sale | on_sale | Enabled | Products with compare_at_price > price |
| Featured Collection | featured | Enabled | Products marked as featured |
| From Our Blog | blogs | Enabled | Latest published blog posts |

## Technical Considerations

### Database Queries for On Sale Products
To fetch "on sale" products, we'll use a Supabase filter:
```typescript
supabase
  .from('products')
  .select('*')
  .not('compare_at_price', 'is', null)
  .gt('compare_at_price', 'price')
  .order('display_order', { ascending: true })
  .limit(limit)
```

Note: Supabase doesn't directly support comparing two columns, so we'll fetch products with `compare_at_price` and filter client-side, or use a database view/function for better performance.

### Alternative: Client-side filtering
Fetch all products with compare_at_price set, then filter in JavaScript:
```typescript
const onSaleProducts = products.filter(p => 
  p.compare_at_price && p.compare_at_price > p.price
);
```

### Section Settings Schema
```typescript
interface SectionSettings {
  limit?: number;        // Number of items to show
  columns?: number;      // Grid columns (2, 3, or 4)
  showViewAll?: boolean; // Show "View All" button
  viewAllLink?: string;  // Custom link for "View All"
  background?: 'default' | 'secondary' | 'accent';
}
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/SiteSettingsContext.tsx` | Modify | Add HomepageSection types and defaults |
| `src/components/home/HomepageSection.tsx` | Create | Section renderer component |
| `src/components/admin/HomepageSectionsEditor.tsx` | Create | Admin editor for sections |
| `src/pages/Index.tsx` | Modify | Use dynamic sections |
| `src/pages/admin/AdminCustomization.tsx` | Modify | Add Sections tab |
| `src/components/admin/AdminSidebar.tsx` | Modify | Add Sections nav item |

## Future Extensibility

The architecture supports adding more section types:
- **Reviews Section**: Show approved product reviews
- **Instagram Feed**: Display social media content
- **Custom HTML**: Free-form content blocks
- **Category Showcase**: Highlight specific categories
- **Countdown Timer**: Promotional banners with timers

Each new type only requires:
1. Adding the type to the section types enum
2. Implementing the render logic in HomepageSection
3. Adding the settings editor in HomepageSectionsEditor
