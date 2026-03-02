import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STEADFAST_BASE = "https://portal.packzy.com/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("STEADFAST_API_KEY");
    const secretKey = Deno.env.get("STEADFAST_SECRET_KEY");

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: "Steadfast API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const steadfastHeaders = {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    };

    const { action, order_id, order_ids } = await req.json();

    // Use service role client for DB writes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create_order") {
      // Single order
      const result = await createCourierOrder(serviceClient, order_id, steadfastHeaders);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_create") {
      const results = [];
      for (const id of order_ids || []) {
        try {
          const result = await createCourierOrder(serviceClient, id, steadfastHeaders);
          results.push({ order_id: id, ...result });
        } catch (e: any) {
          results.push({ order_id: id, success: false, error: e.message });
        }
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_status") {
      const { data: order, error: orderErr } = await serviceClient
        .from("orders")
        .select("courier_consignment_id, courier_tracking_code, status")
        .eq("id", order_id)
        .single();

      if (orderErr || !order?.courier_consignment_id) {
        return new Response(
          JSON.stringify({ error: "Order not found or not sent to courier" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusRes = await fetch(
        `${STEADFAST_BASE}/status_by_cid/${order.courier_consignment_id}`,
        { headers: steadfastHeaders }
      );
      const statusData = await statusRes.json();

      if (statusData.status !== 200) {
        return new Response(
          JSON.stringify({ error: statusData.message || "Failed to check status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const courierStatus = statusData.delivery_status;
      const mappedStatus = mapCourierStatus(courierStatus);

      const updateData: Record<string, any> = { courier_status: courierStatus };
      if (mappedStatus && mappedStatus !== order.status) {
        updateData.status = mappedStatus;
      }

      await serviceClient.from("orders").update(updateData).eq("id", order_id);

      return new Response(
        JSON.stringify({
          success: true,
          courier_status: courierStatus,
          mapped_status: mappedStatus,
          updated: updateData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check_balance") {
      const balRes = await fetch(`${STEADFAST_BASE}/get_balance`, {
        headers: steadfastHeaders,
      });
      const balData = await balRes.json();
      return new Response(JSON.stringify(balData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createCourierOrder(
  serviceClient: any,
  orderId: string,
  steadfastHeaders: Record<string, string>
) {
  const { data: order, error: orderErr } = await serviceClient
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) throw new Error("Order not found");
  if (order.courier_consignment_id) throw new Error("Order already sent to courier");

  const { data: items } = await serviceClient
    .from("order_items")
    .select("product_name, quantity, size, color")
    .eq("order_id", orderId);

  const addr = order.shipping_address || {};
  const recipientName = addr.full_name || addr.fullName || "Customer";
  const recipientPhone = addr.phone || "";
  const addressParts = [
    addr.address_line1 || addr.addressLine1,
    addr.address_line2 || addr.addressLine2,
    addr.city,
    addr.state,
    addr.postal_code || addr.postalCode,
  ].filter(Boolean);
  const recipientAddress = addressParts.join(", ");

  const itemsSummary = (items || [])
    .map((i: any) => {
      let desc = `${i.product_name} x${i.quantity}`;
      if (i.size) desc += ` (${i.size})`;
      if (i.color) desc += ` [${i.color}]`;
      return desc;
    })
    .join("; ");

  const payload = {
    invoice: order.order_number,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_address: recipientAddress,
    cod_amount: order.total,
    note: itemsSummary || order.notes || "",
  };

  const res = await fetch(`${STEADFAST_BASE}/create_order`, {
    method: "POST",
    headers: steadfastHeaders,
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (data.status !== 200) {
    throw new Error(data.message || "Steadfast API error");
  }

  const consignment = data.consignment;
  const trackingCode = consignment.tracking_code;
  const trackingUrl = `https://steadfast.com.bd/t/${trackingCode}`;

  await serviceClient
    .from("orders")
    .update({
      courier_name: "steadfast",
      courier_consignment_id: String(consignment.consignment_id),
      courier_tracking_code: trackingCode,
      courier_tracking_url: trackingUrl,
      courier_status: consignment.status || "pending",
      status: order.status === "pending" ? "processing" : order.status,
    })
    .eq("id", orderId);

  return {
    success: true,
    consignment_id: consignment.consignment_id,
    tracking_code: trackingCode,
    tracking_url: trackingUrl,
  };
}

function mapCourierStatus(courierStatus: string): string | null {
  switch (courierStatus) {
    case "in_review":
    case "pending":
      return "processing";
    case "delivered":
    case "partial_delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}
