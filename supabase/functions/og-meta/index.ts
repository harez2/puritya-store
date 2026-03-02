import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CRAWLER_BOTS = [
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot',
  'WhatsApp', 'TelegramBot', 'Slackbot', 'Discordbot',
  'Pinterest', 'Embedly', 'Quora Link Preview', 'Showyoubot',
  'vkShare', 'Viber', 'Line', 'Googlebot', 'bingbot',
]

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return true // treat missing UA as crawler for safety
  return CRAWLER_BOTS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()))
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function buildHtml(title: string, description: string, image: string, url: string, type = 'website'): string {
  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${escapeHtml(url)}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ''}
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(url)}">${safeTitle}</a>...</p>
</body>
</html>`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.searchParams.get('path') || '/'
    const userAgent = req.headers.get('user-agent')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get site settings for fallbacks
    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['store_name', 'store_logo', 'seo_og_image'])

    const settingsMap: Record<string, string> = {}
    siteSettings?.forEach((s: any) => {
      settingsMap[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value)
    })

    // Clean setting values (remove surrounding quotes from JSON strings)
    for (const key of Object.keys(settingsMap)) {
      const val = settingsMap[key]
      if (val.startsWith('"') && val.endsWith('"')) {
        settingsMap[key] = val.slice(1, -1)
      }
    }

    const storeName = settingsMap['store_name'] || 'Store'
    const defaultImage = settingsMap['seo_og_image'] || settingsMap['store_logo'] || ''
    const siteUrl = 'https://puritya-store.lovable.app'
    const fullUrl = `${siteUrl}${path}`

    let title = storeName
    let description = ''
    let image = defaultImage
    let ogType = 'website'

    // Parse path to determine content type
    const productMatch = path.match(/^\/product\/([^/]+)$/)
    const blogMatch = path.match(/^\/blog\/([^/]+)$/)
    const landingMatch = path.match(/^\/lp\/([^/]+)$/)
    const pageMatch = path.match(/^\/page\/([^/]+)$/)

    if (productMatch) {
      const slug = productMatch[1]
      const { data: product } = await supabase
        .from('products')
        .select('name, images, meta_description, short_description, description, price')
        .eq('slug', slug)
        .maybeSingle()

      if (product) {
        title = `${product.name} | ${storeName}`
        description = product.meta_description ||
          (product.short_description ? stripHtml(product.short_description).substring(0, 160) : '') ||
          (product.description ? stripHtml(product.description).substring(0, 160) : '')
        image = product.images?.[0] || defaultImage
        ogType = 'product'
      }
    } else if (blogMatch) {
      const slug = blogMatch[1]
      const { data: blog } = await supabase
        .from('blogs')
        .select('title, featured_image, meta_description, excerpt, content')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()

      if (blog) {
        title = `${blog.title} | ${storeName} Blog`
        description = blog.meta_description || blog.excerpt || stripHtml(blog.content).substring(0, 160)
        image = blog.featured_image || defaultImage
        ogType = 'article'
      }
    } else if (landingMatch) {
      const slug = landingMatch[1]
      const { data: lp } = await supabase
        .from('landing_pages')
        .select('title, meta_title, meta_description, og_image')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (lp) {
        title = lp.meta_title || lp.title
        description = lp.meta_description || ''
        image = lp.og_image || defaultImage
      }
    } else if (pageMatch) {
      const slug = pageMatch[1]
      const { data: page } = await supabase
        .from('pages')
        .select('title, meta_description')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()

      if (page) {
        title = `${page.title} | ${storeName}`
        description = page.meta_description || ''
        image = defaultImage
      }
    } else if (path === '/' || path === '') {
      // Homepage - try to get hero slider image
      const { data: heroSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_slides')
        .maybeSingle()

      if (heroSetting?.value) {
        try {
          const slides = typeof heroSetting.value === 'string' 
            ? JSON.parse(heroSetting.value) 
            : heroSetting.value
          if (Array.isArray(slides) && slides.length > 0 && slides[0].image) {
            image = slides[0].image
          }
        } catch { /* ignore parse errors */ }
      }

      title = storeName
      description = settingsMap['meta_description'] || `Welcome to ${storeName}`
    }

    // If it's a crawler, return the OG HTML
    if (isCrawler(userAgent)) {
      const html = buildHtml(title, description, image, fullUrl, ogType)
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // For regular users, redirect to the actual page
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': fullUrl },
    })
  } catch (error) {
    console.error('OG Meta error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
