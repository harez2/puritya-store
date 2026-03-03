import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  phone: string;
  session_id: string;
  provider?: 'bulksmsbd' | 'reve_system';
  otp_message_template?: string;
  otp_expiry_minutes?: number;
}

const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const formatBangladeshPhone = (phone: string): string => {
  let formatted = phone.replace(/\D/g, "");
  if (formatted.startsWith("0")) {
    formatted = "88" + formatted;
  } else if (!formatted.startsWith("880")) {
    formatted = "880" + formatted;
  }
  return formatted;
};

const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
};

const sendViaBulkSmsBd = async (
  phone: string,
  message: string,
  apiKey: string,
  senderId: string
): Promise<{ success: boolean; error?: string }> => {
  const encodedMessage = encodeURIComponent(message);
  const apiUrl = `https://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${phone}&senderid=${senderId}&message=${encodedMessage}`;

  console.log(`Sending OTP to ${phone} via BulkSMSBD`);

  try {
    const response = await fetchWithTimeout(apiUrl, { method: "GET" });
    const responseText = await response.text();
    console.log("BulkSMSBD Response:", responseText);

    if (!response.ok) {
      return { success: false, error: `BulkSMSBD error: ${responseText}` };
    }
    return { success: true };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: "SMS API request timed out (10s)" };
    }
    throw err;
  }
};

const sendViaReveSystem = async (
  phone: string,
  message: string,
  apiKey: string,
  apiSecret: string,
  senderId: string
): Promise<{ success: boolean; error?: string }> => {
  const params = new URLSearchParams({
    api_key: apiKey,
    type: "text",
    contacts: phone,
    senderid: senderId,
    msg: message,
  });

  console.log(`Sending OTP to ${phone} via Reve System`);

  try {
    const response = await fetchWithTimeout(`https://api.revesms.com/smsapi?${params.toString()}`, { method: "GET" });
    const responseText = await response.text();
    console.log("Reve System Response:", responseText);

    if (!response.ok) {
      return { success: false, error: `Reve System error: ${responseText}` };
    }

    try {
      const result = JSON.parse(responseText);
      if (result.status === "FAILED" || result.error) {
        return { success: false, error: result.error || "SMS sending failed" };
      }
    } catch {
      if (responseText.toLowerCase().includes("error") || responseText.toLowerCase().includes("failed")) {
        return { success: false, error: responseText };
      }
    }

    return { success: true };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: "SMS API request timed out (10s)" };
    }
    throw err;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      phone,
      session_id,
      provider = 'bulksmsbd',
      otp_message_template = "Your verification code is: {otp}. Valid for 5 minutes.",
      otp_expiry_minutes = 5,
    }: SendOtpRequest = await req.json();

    if (!phone || !session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone and session_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedPhone = formatBangladeshPhone(phone);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read SMS credentials server-side from site_settings
    const { data: otpSettingsRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "otp_settings")
      .maybeSingle();

    const siteOtpSettings = (otpSettingsRow?.value && typeof otpSettingsRow.value === 'object')
      ? otpSettingsRow.value as Record<string, unknown>
      : {};

    // Rate limiting: max 3 in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOtps } = await supabase
      .from("otp_verifications")
      .select("id")
      .eq("phone", formattedPhone)
      .gte("created_at", tenMinutesAgo);

    if (recentOtps && recentOtps.length >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many OTP requests. Please wait 10 minutes before trying again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + otp_expiry_minutes * 60 * 1000).toISOString();

    // Store OTP
    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({
        phone: formattedPhone,
        otp_code: otpCode,
        expires_at: expiresAt,
        session_id,
        verified: false,
        attempts: 0,
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const message = otp_message_template.replace("{otp}", otpCode);

    // Send OTP via selected provider using server-side credentials
    let sendResult: { success: boolean; error?: string };

    if (provider === 'reve_system') {
      const apiKey = (siteOtpSettings.reve_api_key as string) || Deno.env.get("REVE_API_KEY") || "";
      const apiSecret = (siteOtpSettings.reve_api_secret as string) || Deno.env.get("REVE_API_SECRET") || "";
      const senderId = (siteOtpSettings.reve_sender_id as string) || Deno.env.get("REVE_SENDER_ID") || "";

      if (!apiKey || !senderId) {
        return new Response(
          JSON.stringify({ success: false, error: "Reve System credentials not configured" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      sendResult = await sendViaReveSystem(formattedPhone, message, apiKey, apiSecret, senderId);
    } else {
      const apiKey = (siteOtpSettings.bulksms_api_key as string) || Deno.env.get("BULKSMS_API_KEY") || "";
      const senderId = (siteOtpSettings.bulksms_sender_id as string) || Deno.env.get("BULKSMS_SENDER_ID") || "";

      if (!apiKey || !senderId) {
        return new Response(
          JSON.stringify({ success: false, error: "BulkSMSBD credentials not configured" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      sendResult = await sendViaBulkSmsBd(formattedPhone, message, apiKey, senderId);
    }

    if (!sendResult.success) {
      await supabase
        .from("otp_verifications")
        .delete()
        .eq("phone", formattedPhone)
        .eq("otp_code", otpCode);

      return new Response(
        JSON.stringify({ success: false, error: sendResult.error || "Failed to send SMS" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully", expires_at: expiresAt }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
