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
  // Provider credentials (from site settings)
  bulksms_api_key?: string;
  bulksms_sender_id?: string;
  reve_api_key?: string;
  reve_api_secret?: string;
  reve_sender_id?: string;
  // OTP settings
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

const sendViaBulkSmsBd = async (
  phone: string,
  message: string,
  apiKey: string,
  senderId: string
): Promise<{ success: boolean; error?: string }> => {
  const encodedMessage = encodeURIComponent(message);
  const apiUrl = `http://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${phone}&senderid=${senderId}&message=${encodedMessage}`;

  console.log(`Sending OTP to ${phone} via BulkSMSBD`);

  const response = await fetch(apiUrl, { method: "GET" });
  const responseText = await response.text();
  console.log("BulkSMSBD Response:", responseText);

  if (!response.ok) {
    return { success: false, error: `BulkSMSBD error: ${responseText}` };
  }

  return { success: true };
};

const sendViaReveSystem = async (
  phone: string,
  message: string,
  apiKey: string,
  apiSecret: string,
  senderId: string
): Promise<{ success: boolean; error?: string }> => {
  // Reve System SMS API implementation
  const apiUrl = "http://api.revesms.com/smsapi";
  
  console.log(`Sending OTP to ${phone} via Reve System`);

  const params = new URLSearchParams({
    api_key: apiKey,
    type: "text",
    contacts: phone,
    senderid: senderId,
    msg: message,
  });

  const response = await fetch(`${apiUrl}?${params.toString()}`, { method: "GET" });
  const responseText = await response.text();
  console.log("Reve System Response:", responseText);

  if (!response.ok) {
    return { success: false, error: `Reve System error: ${responseText}` };
  }

  // Check for success in response (Reve typically returns JSON or specific success codes)
  try {
    const result = JSON.parse(responseText);
    if (result.status === "FAILED" || result.error) {
      return { success: false, error: result.error || "SMS sending failed" };
    }
  } catch {
    // If not JSON, check for error patterns in text
    if (responseText.toLowerCase().includes("error") || responseText.toLowerCase().includes("failed")) {
      return { success: false, error: responseText };
    }
  }

  return { success: true };
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
      bulksms_api_key,
      bulksms_sender_id,
      reve_api_key,
      reve_api_secret,
      reve_sender_id,
      otp_message_template = "Your Puritya verification code is: {otp}. Valid for 5 minutes.",
      otp_expiry_minutes = 5,
    }: SendOtpRequest = await req.json();

    if (!phone || !session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone and session_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format phone number
    const formattedPhone = formatBangladeshPhone(phone);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting: Check recent OTPs for this phone (max 3 in 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOtps, error: countError } = await supabase
      .from("otp_verifications")
      .select("id")
      .eq("phone", formattedPhone)
      .gte("created_at", tenMinutesAgo);

    if (countError) {
      console.error("Error checking rate limit:", countError);
    }

    if (recentOtps && recentOtps.length >= 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many OTP requests. Please wait 10 minutes before trying again." 
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + otp_expiry_minutes * 60 * 1000).toISOString();

    // Store OTP in database
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

    // Prepare message
    const message = otp_message_template.replace("{otp}", otpCode);

    // Send OTP via selected provider
    let sendResult: { success: boolean; error?: string };

    if (provider === 'reve_system') {
      const apiKey = reve_api_key || Deno.env.get("REVE_API_KEY");
      const apiSecret = reve_api_secret || Deno.env.get("REVE_API_SECRET");
      const senderId = reve_sender_id || Deno.env.get("REVE_SENDER_ID");

      if (!apiKey || !senderId) {
        return new Response(
          JSON.stringify({ success: false, error: "Reve System credentials not configured" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      sendResult = await sendViaReveSystem(formattedPhone, message, apiKey, apiSecret || "", senderId);
    } else {
      // Default: BulkSMSBD
      const apiKey = bulksms_api_key || Deno.env.get("BULKSMS_API_KEY");
      const senderId = bulksms_sender_id || Deno.env.get("BULKSMS_SENDER_ID");

      if (!apiKey || !senderId) {
        return new Response(
          JSON.stringify({ success: false, error: "BulkSMSBD credentials not configured" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      sendResult = await sendViaBulkSmsBd(formattedPhone, message, apiKey, senderId);
    }

    if (!sendResult.success) {
      // Delete the OTP record since SMS failed
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
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        expires_at: expiresAt,
      }),
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
