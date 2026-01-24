import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

interface Product {
  slug: string;
  updated_at: string;
}

interface Blog {
  slug: string;
  updated_at: string;
  published: boolean;
}

interface Page {
  slug: string;
  updated_at: string;
  published: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get base URL from request or environment
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get("base_url") || "https://puritya-store.lovable.app";

    console.log("Generating sitemap for base URL:", baseUrl);

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("slug, updated_at")
      .order("updated_at", { ascending: false });

    if (productsError) {
      console.error("Error fetching products:", productsError);
    }

    // Fetch published blogs
    const { data: blogs, error: blogsError } = await supabase
      .from("blogs")
      .select("slug, updated_at, published")
      .eq("published", true)
      .order("updated_at", { ascending: false });

    if (blogsError) {
      console.error("Error fetching blogs:", blogsError);
    }

    // Fetch published pages
    const { data: pages, error: pagesError } = await supabase
      .from("pages")
      .select("slug, updated_at, published")
      .eq("published", true)
      .order("updated_at", { ascending: false });

    if (pagesError) {
      console.error("Error fetching pages:", pagesError);
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("slug, created_at")
      .order("created_at", { ascending: false });

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
    }

    const now = new Date().toISOString().split("T")[0];

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/shop</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/wishlist</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
`;

    // Add categories
    if (categories && categories.length > 0) {
      sitemap += `\n  <!-- Categories -->\n`;
      for (const category of categories) {
        const lastmod = category.created_at 
          ? new Date(category.created_at).toISOString().split("T")[0] 
          : now;
        sitemap += `  <url>
    <loc>${baseUrl}/shop?category=${encodeURIComponent(category.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Add products
    if (products && products.length > 0) {
      sitemap += `\n  <!-- Products -->\n`;
      for (const product of products as Product[]) {
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split("T")[0] 
          : now;
        sitemap += `  <url>
    <loc>${baseUrl}/product/${encodeURIComponent(product.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add blog posts
    if (blogs && blogs.length > 0) {
      sitemap += `\n  <!-- Blog Posts -->\n`;
      for (const blog of blogs as Blog[]) {
        const lastmod = blog.updated_at 
          ? new Date(blog.updated_at).toISOString().split("T")[0] 
          : now;
        sitemap += `  <url>
    <loc>${baseUrl}/blog/${encodeURIComponent(blog.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Add dynamic pages
    if (pages && pages.length > 0) {
      sitemap += `\n  <!-- Pages -->\n`;
      for (const page of pages as Page[]) {
        const lastmod = page.updated_at 
          ? new Date(page.updated_at).toISOString().split("T")[0] 
          : now;
        sitemap += `  <url>
    <loc>${baseUrl}/page/${encodeURIComponent(page.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    sitemap += `</urlset>`;

    console.log(`Sitemap generated with ${(products?.length || 0)} products, ${(blogs?.length || 0)} blogs, ${(pages?.length || 0)} pages, ${(categories?.length || 0)} categories`);

    return new Response(sitemap, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://puritya-store.lovable.app/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }
});