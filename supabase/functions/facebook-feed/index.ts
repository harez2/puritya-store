import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  in_stock: boolean;
  stock_quantity: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'xml';
    
    // Get store URL from query params or use default
    const storeUrl = url.searchParams.get('store_url') || 'https://puritya-store.lovable.app';
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error('Failed to fetch products');
    }

    // Fetch categories for product_type mapping
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
    }

    const categoryMap = new Map<string, string>();
    if (categories) {
      categories.forEach((cat: Category) => {
        categoryMap.set(cat.id, cat.name);
      });
    }

    // Fetch site settings for store info
    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['store_name', 'currency']);

    const settingsMap = new Map<string, string>();
    if (settings) {
      settings.forEach((s: { key: string; value: string }) => {
        settingsMap.set(s.key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value));
      });
    }

    const storeName = settingsMap.get('store_name') || 'Puritya Store';
    const currency = 'BDT'; // Bangladesh Taka

    if (format === 'csv') {
      const csvContent = generateCSV(products || [], storeUrl, currency, categoryMap);
      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="facebook-product-feed.csv"',
        },
      });
    }

    // Default to XML format
    const xmlContent = generateXML(products || [], storeUrl, storeName, currency, categoryMap);
    return new Response(xmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="facebook-product-feed.xml"',
      },
    });

  } catch (error: unknown) {
    console.error('Error generating feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate feed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function escapeXml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function generateXML(
  products: Product[],
  storeUrl: string,
  storeName: string,
  currency: string,
  categoryMap: Map<string, string>
): string {
  const items = products.map((product) => {
    const availability = product.in_stock && product.stock_quantity > 0 ? 'in stock' : 'out of stock';
    const productUrl = `${storeUrl}/product/${product.slug}`;
    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '';
    const description = stripHtml(product.description || product.short_description || product.name);
    const categoryName = product.category_id ? categoryMap.get(product.category_id) || '' : '';
    
    // Additional images (up to 10)
    const additionalImages = (product.images || [])
      .slice(1, 10)
      .map((img) => `      <additional_image_link>${escapeXml(img)}</additional_image_link>`)
      .join('\n');

    return `  <item>
    <g:id>${escapeXml(product.id)}</g:id>
    <g:title>${escapeXml(product.name)}</g:title>
    <g:description>${escapeXml(description.substring(0, 5000))}</g:description>
    <g:link>${escapeXml(productUrl)}</g:link>
    <g:image_link>${escapeXml(imageUrl)}</g:image_link>
${additionalImages ? additionalImages + '\n' : ''}    <g:availability>${availability}</g:availability>
    <g:price>${product.price.toFixed(2)} ${currency}</g:price>
${product.compare_at_price ? `    <g:sale_price>${product.price.toFixed(2)} ${currency}</g:sale_price>\n    <g:price>${product.compare_at_price.toFixed(2)} ${currency}</g:price>\n` : ''}    <g:condition>new</g:condition>
    <g:brand>${escapeXml(storeName)}</g:brand>
${categoryName ? `    <g:product_type>${escapeXml(categoryName)}</g:product_type>\n` : ''}    <g:inventory>${product.stock_quantity}</g:inventory>
  </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${escapeXml(storeName)} Product Feed</title>
  <link>${escapeXml(storeUrl)}</link>
  <description>Product feed for Facebook Catalog</description>
${items}
</channel>
</rss>`;
}

function escapeCSV(text: string | null | undefined): string {
  if (!text) return '';
  // If contains comma, newline, or quote, wrap in quotes and escape quotes
  if (text.includes(',') || text.includes('\n') || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function generateCSV(
  products: Product[],
  storeUrl: string,
  currency: string,
  categoryMap: Map<string, string>
): string {
  const headers = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'product_type',
    'inventory',
  ];

  const rows = products.map((product) => {
    const availability = product.in_stock && product.stock_quantity > 0 ? 'in stock' : 'out of stock';
    const productUrl = `${storeUrl}/product/${product.slug}`;
    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : '';
    const description = stripHtml(product.description || product.short_description || product.name);
    const categoryName = product.category_id ? categoryMap.get(product.category_id) || '' : '';

    return [
      escapeCSV(product.id),
      escapeCSV(product.name),
      escapeCSV(description.substring(0, 5000)),
      availability,
      'new',
      `${product.price.toFixed(2)} ${currency}`,
      escapeCSV(productUrl),
      escapeCSV(imageUrl),
      'Puritya Store',
      escapeCSV(categoryName),
      product.stock_quantity.toString(),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
