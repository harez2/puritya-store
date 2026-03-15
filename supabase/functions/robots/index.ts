import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/plain; charset=utf-8",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: storeUrlSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "store_url")
      .maybeSingle();

    const storeUrl = (typeof storeUrlSetting?.value === 'string' 
      ? storeUrlSetting.value.trim().replace(/\/$/, '') 
      : '') || "https://puritya-store.lovable.app";

    const robotsTxt = `# Robots.txt
# ${storeUrl}

# Allow all search engines
User-agent: *
Allow: /

# Disallow admin and auth pages
Disallow: /admin
Disallow: /admin/*
Disallow: /auth
Disallow: /checkout

# Google
User-agent: Googlebot
Allow: /

# Bing
User-agent: Bingbot
Allow: /

# Social Media Crawlers
User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Pinterest
Allow: /

# Sitemap location
Sitemap: ${supabaseUrl}/functions/v1/sitemap?base_url=${encodeURIComponent(storeUrl)}
`;

    return new Response(robotsTxt, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Error generating robots.txt:", error);
    return new Response("User-agent: *\nAllow: /\n", {
      status: 200,
      headers: corsHeaders,
    });
  }
});
