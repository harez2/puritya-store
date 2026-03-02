

## Problem

When sharing product or page URLs on social media (Facebook, Twitter, WhatsApp, etc.), the link preview shows the default site favicon/image instead of the product's featured image or page-specific image. This happens because social media crawlers don't execute JavaScript — they only read the raw HTML served by the server. Since this is a client-side React SPA, the `og:image` meta tags set via `react-helmet` are invisible to crawlers.

## Solution: Open Graph Meta Tag Proxy via Backend Function

Create a backend function that intercepts requests from social media crawlers (identified by user-agent) and returns a lightweight HTML page with the correct Open Graph meta tags, including the product/page-specific image. Non-crawler requests pass through normally to the SPA.

### How it works

1. **New edge function `og-meta`** — Accepts a URL path, detects if the request is from a known crawler (Facebook, Twitter, LinkedIn, WhatsApp, Telegram, etc.), queries the database for the relevant content (product, blog, page, landing page), and returns a minimal HTML document with proper `og:image`, `og:title`, `og:description` tags plus a redirect to the actual page.

2. **Crawler detection** — Check user-agent for known bot strings: `facebookexternalhit`, `Twitterbot`, `LinkedInBot`, `WhatsApp`, `TelegramBot`, `Slackbot`, `Discordbot`, etc.

3. **Content-specific meta tags**:
   - **Product pages** (`/product/:slug`): Use `product.images[0]` as `og:image`, product name as title, meta description or excerpt
   - **Blog posts** (`/blog/:slug`): Use `featured_image` as `og:image`
   - **Landing pages** (`/lp/:slug`): Use `og_image` from the landing page record
   - **Dynamic pages** (`/page/:slug`): Use store default image
   - **Homepage** (`/`): Use hero slider first slide image or default OG image from site settings

4. **Fallback chain**: Page-specific image → site SEO OG image → store logo → empty

### Technical details

- The edge function will query `products`, `blogs`, `landing_pages`, `pages`, and `site_settings` tables as needed based on the URL path
- Returns a minimal HTML with meta tags + a `<meta http-equiv="refresh">` redirect to the actual URL for any real users who somehow hit the function directly
- The function URL would need to be used as the canonical share URL, or a redirect/rewrite rule would need to be set up

### Alternative: Update `index.html` dynamically

Since we can't do server-side rendering with Vite, and edge function URL rewrites aren't straightforward for the main domain, a more practical approach is:

1. **Create a sharing helper** in the admin/frontend that generates share URLs routed through the edge function
2. **Or** use the edge function as an OG proxy: `/functions/v1/og-meta?path=/product/my-product` — social platforms would need this URL to be the shared link

### Recommended approach

Create the `og-meta` edge function and add a "Copy Share Link" button on product pages and other shareable pages that generates the correct OG-proxied URL. This way, when users share via that link, crawlers get proper meta tags.

### Files to create/modify
- **Create** `supabase/functions/og-meta/index.ts` — crawler-aware meta tag server
- **Modify** `src/pages/ProductDetail.tsx` — add share button with OG-proxied URL
- **Modify** `src/pages/BlogDetail.tsx` — add share button with OG-proxied URL
- **Optionally** add share buttons to other shareable pages

