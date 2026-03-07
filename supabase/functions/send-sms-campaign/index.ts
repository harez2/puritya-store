import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id is required");

    // Get campaign
    const { data: campaign, error: cErr } = await supabase
      .from("sms_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (cErr || !campaign) throw new Error("Campaign not found");

    // Get SMS settings
    const { data: smsSettings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();

    const cfg = smsSettings?.value as any || {};
    const apiKey = cfg.api_key || Deno.env.get("BULKSMS_API_KEY");
    const senderId = cfg.sender_id || Deno.env.get("BULKSMS_SENDER_ID");

    if (!apiKey || !senderId) {
      await supabase.from("sms_campaigns").update({ status: "failed" }).eq("id", campaign_id);
      throw new Error("SMS API credentials not configured");
    }

    // Update campaign status to sending
    await supabase.from("sms_campaigns").update({ status: "sending", started_at: new Date().toISOString() }).eq("id", campaign_id);

    // Get pending recipients
    const { data: recipients } = await supabase
      .from("sms_campaign_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");

    if (!recipients || recipients.length === 0) {
      await supabase.from("sms_campaigns").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", campaign_id);
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sentCount = campaign.sent_count || 0;
    let failedCount = campaign.failed_count || 0;

    for (const recipient of recipients) {
      try {
        // Replace placeholders in message
        let msg = campaign.message;
        msg = msg.replace(/\{customer_name\}/gi, recipient.customer_name || "Customer");

        // Format phone
        let phone = (recipient.phone || "").replace(/\D/g, "");
        if (phone.startsWith("0")) phone = "88" + phone;
        else if (!phone.startsWith("880")) phone = "880" + phone;

        const encodedMsg = encodeURIComponent(msg);
        const apiUrl = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${phone}&senderid=${senderId}&message=${encodedMsg}`;

        const res = await fetch(apiUrl);
        const resText = await res.text();

        if (res.ok) {
          sentCount++;
          await supabase.from("sms_campaign_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", recipient.id);
        } else {
          failedCount++;
          await supabase.from("sms_campaign_recipients").update({ status: "failed", error_message: resText.substring(0, 500) }).eq("id", recipient.id);
        }
      } catch (e: any) {
        failedCount++;
        await supabase.from("sms_campaign_recipients").update({ status: "failed", error_message: e.message?.substring(0, 500) }).eq("id", recipient.id);
      }

      // Update counts periodically
      if ((sentCount + failedCount) % 10 === 0) {
        await supabase.from("sms_campaigns").update({ sent_count: sentCount, failed_count: failedCount }).eq("id", campaign_id);
      }
    }

    // Final update
    await supabase.from("sms_campaigns").update({
      status: "completed",
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Campaign error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
