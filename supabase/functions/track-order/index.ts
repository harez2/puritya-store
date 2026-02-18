import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { searchType, searchValue } = await req.json();

    if (!searchType || !searchValue?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing search parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        payment_status,
        payment_method,
        subtotal,
        shipping_fee,
        total,
        created_at,
        shipping_address,
        order_items (
          id,
          product_name,
          quantity,
          price,
          size,
          color,
          product_image
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (searchType === "order_number") {
      query = query.ilike("order_number", `%${searchValue.trim()}%`);
    } else if (searchType === "phone") {
      query = query.filter("shipping_address->>phone", "ilike", `%${searchValue.trim()}%`);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid search type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({ orders: data || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Track order error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to search orders" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
