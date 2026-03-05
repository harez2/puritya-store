

## Fix Facebook Product Feed Domain

### Problem
The Facebook product feed edge function hardcodes `https://puritya-store.lovable.app` as the default store URL. When you deploy to your own domain, product links in the catalog still point to the Lovable subdomain.

### Solution
Store your custom domain as a site setting (`store_url`) and have the feed function read it from the database instead of using a hardcode.

### Changes

**1. Add Store URL setting to Admin Settings**
- Add a "Store URL / Domain" input field in the admin settings (e.g., under General or Branding section) that saves to `site_settings` with key `store_url`.
- Default display: `https://puritya-store.lovable.app`

**2. Update the `facebook-feed` edge function**
- Instead of defaulting to the Lovable subdomain, fetch the `store_url` from `site_settings` table.
- Fall back to the `store_url` query parameter, then to the current hardcoded default.
- This way all product links (`{storeUrl}/product/{slug}`) will use your custom domain automatically.

**3. Update Feed URL display in admin**
- In `FacebookPixelSetup.tsx`, append `?store_url=...` to the displayed feed URLs is no longer needed since the function will read from DB directly. No change needed there.

### Files to Modify
- `supabase/functions/facebook-feed/index.ts` — read `store_url` from `site_settings` table as primary source
- `src/pages/admin/AdminSettings.tsx` — add Store URL input field
- `src/contexts/SiteSettingsContext.tsx` — ensure `store_url` is part of settings type (if needed)

