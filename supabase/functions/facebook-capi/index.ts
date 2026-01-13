import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FacebookEventData {
  event_name: string;
  event_id: string;
  event_time: number;
  event_source_url: string;
  user_data: {
    client_ip_address?: string;
    client_user_agent: string;
    fbc?: string;
    fbp?: string;
    em?: string;
    ph?: string;
    fn?: string;
    ln?: string;
    external_id?: string;
  };
  custom_data?: Record<string, any>;
  action_source: "website";
}

// Hash function for PII (required by Facebook)
async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pixel_id, event_data, access_token } = await req.json();

    // Use provided access token or fall back to secret
    const accessToken = access_token || Deno.env.get("FACEBOOK_CAPI_ACCESS_TOKEN");
    
    if (!accessToken) {
      console.error("Facebook access token not provided");
      return new Response(
        JSON.stringify({ error: "Facebook access token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pixel_id || !event_data) {
      return new Response(
        JSON.stringify({ error: "Missing pixel_id or event_data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP from headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Hash PII fields as required by Facebook
    const hashedUserData: Record<string, any> = {
      client_ip_address: clientIp,
      client_user_agent: event_data.user_data.client_user_agent,
    };

    if (event_data.user_data.fbc) {
      hashedUserData.fbc = event_data.user_data.fbc;
    }
    if (event_data.user_data.fbp) {
      hashedUserData.fbp = event_data.user_data.fbp;
    }
    if (event_data.user_data.em) {
      hashedUserData.em = await hashSHA256(event_data.user_data.em);
    }
    if (event_data.user_data.ph) {
      hashedUserData.ph = await hashSHA256(event_data.user_data.ph);
    }
    if (event_data.user_data.fn) {
      hashedUserData.fn = await hashSHA256(event_data.user_data.fn);
    }
    if (event_data.user_data.ln) {
      hashedUserData.ln = await hashSHA256(event_data.user_data.ln);
    }
    if (event_data.user_data.external_id) {
      hashedUserData.external_id = await hashSHA256(event_data.user_data.external_id);
    }

    // Prepare Facebook API payload
    const payload = {
      data: [
        {
          event_name: event_data.event_name,
          event_time: event_data.event_time,
          event_id: event_data.event_id,
          event_source_url: event_data.event_source_url,
          action_source: event_data.action_source,
          user_data: hashedUserData,
          custom_data: event_data.custom_data,
        },
      ],
    };

    // Send to Facebook Conversions API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pixel_id}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error("Facebook CAPI error:", fbResult);
      return new Response(
        JSON.stringify({ error: "Facebook API error", details: fbResult }),
        { status: fbResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Facebook CAPI success:", fbResult);

    return new Response(
      JSON.stringify({ success: true, result: fbResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Facebook CAPI error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
