import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const order = payload.record || payload.new;

    if (!order) {
      return new Response(JSON.stringify({ success: false, error: "No order data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch admin notification settings
    const { data: notifData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "admin_notification_settings")
      .maybeSingle();

    const settings = notifData?.value as {
      enabled?: boolean;
      smsEnabled?: boolean;
      adminPhone?: string;
      adminPhones?: string[];
      adminSmsTemplate?: string;
    } | null;

    if (!settings?.enabled || !settings?.smsEnabled) {
      console.log("Admin SMS notifications disabled");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Resolve phone numbers
    let phones: string[] = [];
    if (settings.adminPhones && settings.adminPhones.length > 0) {
      phones = settings.adminPhones.filter((p: string) => p.trim());
    } else if (settings.adminPhone && settings.adminPhone.trim()) {
      phones = [settings.adminPhone.trim()];
    }

    if (phones.length === 0) {
      console.log("No admin phone numbers configured");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_phones" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build message from template
    const defaultTemplate = "New order #{order_number} received! Total: ৳{total}. Customer: {customer_name}";
    const template = settings.adminSmsTemplate || defaultTemplate;

    const shippingAddress = order.shipping_address as any;
    const customerName = shippingAddress?.full_name || "Guest";
    const customerPhone = shippingAddress?.phone || "";
    const address = [shippingAddress?.address_line1, shippingAddress?.city].filter(Boolean).join(", ") || "";

    const message = template
      .replace(/\{order_number\}/g, order.order_number || "N/A")
      .replace(/\{total\}/g, (order.total || 0).toLocaleString())
      .replace(/\{customer_name\}/g, customerName)
      .replace(/\{phone\}/g, customerPhone)
      .replace(/\{address\}/g, address);

    // Fetch SMS API credentials
    const { data: smsData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();

    const smsSettings = smsData?.value as {
      enabled?: boolean;
      apiKey?: string;
      senderId?: string;
      useCustomApi?: boolean;
    } | null;

    if (!smsSettings?.enabled) {
      console.log("SMS service is disabled globally");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "sms_disabled" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const apiKey = smsSettings.useCustomApi && smsSettings.apiKey ? smsSettings.apiKey : Deno.env.get("BULKSMS_API_KEY");
    const senderId = smsSettings.useCustomApi && smsSettings.senderId ? smsSettings.senderId : Deno.env.get("BULKSMS_SENDER_ID");

    if (!apiKey || !senderId) {
      console.error("Missing SMS API credentials");
      return new Response(JSON.stringify({ success: false, error: "Missing SMS credentials" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send SMS to each admin phone
    const results = await Promise.allSettled(
      phones.map(async (phone) => {
        let formattedPhone = phone.replace(/\D/g, "");
        if (formattedPhone.startsWith("0")) {
          formattedPhone = "88" + formattedPhone;
        } else if (!formattedPhone.startsWith("880")) {
          formattedPhone = "880" + formattedPhone;
        }

        const encodedMessage = encodeURIComponent(message);
        const apiUrl = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${formattedPhone}&senderid=${senderId}&message=${encodedMessage}`;

        console.log(`Sending admin notification SMS to ${formattedPhone}`);
        const res = await fetch(apiUrl, { method: "GET" });
        const text = await res.text();
        console.log(`SMS API response for ${formattedPhone}:`, text);
        return { phone: formattedPhone, response: text };
      })
    );

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-order:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
