

## Changes to `supabase/functions/og-meta/index.ts`

**Title**: Use just the page/product name without appending store name.

**Description**: Prioritize SEO meta description, fall back to page content or product description.

### Specific changes:

1. **Products** (`/product/:slug`):
   - Title: `product.name` (remove `| ${storeName}`)
   - Description: already correct (meta_description → short_description → description)

2. **Blogs** (`/blog/:slug`):
   - Title: `blog.title` (remove `| ${storeName} Blog`)
   - Description: already correct (meta_description → excerpt → content)

3. **Pages** (`/page/:slug`):
   - Title: `page.title` (remove `| ${storeName}`)
   - Description: `page.meta_description || stripHtml(page.content).substring(0, 160)` — need to also fetch `content` column

4. **Landing pages** (`/lp/:slug`):
   - Title: `lp.meta_title || lp.title` (already correct)
   - Description: `lp.meta_description` — no simple content fallback since sections are JSON; keep as-is

5. **Homepage** (`/`):
   - Keep store name as title (no specific page name applies)

### Files to modify
- `supabase/functions/og-meta/index.ts`

