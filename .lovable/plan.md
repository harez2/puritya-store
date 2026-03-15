

## Dynamic Sitemap & Robots.txt with Store URL

### Problem
Currently, both the `robots.txt` file and the `sitemap` edge function use hardcoded URLs (`https://puritya-store.lovable.app`) instead of dynamically pulling from the `store_url` setting in the `site_settings` table. This means they won't reflect the actual custom domain configured by the admin.

### Solution

**1. Convert robots.txt to an Edge Function**
- Create `supabase/functions/robots/index.ts` that:
  - Reads `store_url` from `site_settings` table (following the pattern used in `facebook-feed`)
  - Falls back to Lovable preview URL if not set
  - Generates dynamic robots.txt with correct sitemap URL and domain references
  - Returns `text/plain` content type

**2. Update Sitemap Function**
- Modify `supabase/functions/sitemap/index.ts`:
  - Replace hardcoded fallback with database lookup
  - Read `store_url` from `site_settings` table (already has this pattern in facebook-feed)
  - Use the configured domain instead of hardcoded `https://puritya-store.lovable.app`

**3. Update Supabase Config**
- Add `robots` function configuration to `supabase/config.toml` with `verify_jwt = false`

**4. Remove Static File**
- Delete `public/robots.txt` since it will now be served dynamically

### Technical Details

**Database Query Pattern** (reuse from facebook-feed):
```typescript
const { data: storeUrlSetting } = await supabase
  .from('site_settings')
  .select('value')
  .eq('key', 'store_url')
  .maybeSingle();

const storeUrl = storeUrlSetting?.value?.trim().replace(/\/$/, '') 
  || 'https://puritya-store.lovable.app';
```

**Robots.txt Content** (dynamic):
- Sitemap URL: `{storeUrl}/robots/sitemap` (points to edge function)
- Disallow URLs use relative paths (no domain needed)
- All domain references use `storeUrl` variable

**Files to Modify:**
- `supabase/functions/sitemap/index.ts` - Update baseUrl logic
- `supabase/config.toml` - Add robots function config

**Files to Create:**
- `supabase/functions/robots/index.ts` - New edge function

**Files to Delete:**
- `public/robots.txt` - No longer needed

### Result
- SEO tools will see the correct custom domain in both robots.txt and sitemap.xml
- Admin can change domain in Settings → Store URL and both files update automatically
- Falls back gracefully to Lovable preview URL if no custom domain is configured

