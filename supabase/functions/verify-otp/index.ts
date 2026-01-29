import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  phone: string;
  otp_code: string;
  session_id: string;
}

const formatBangladeshPhone = (phone: string): string => {
  let formatted = phone.replace(/\D/g, "");
  if (formatted.startsWith("0")) {
    formatted = "88" + formatted;
  } else if (!formatted.startsWith("880")) {
    formatted = "880" + formatted;
  }
  return formatted;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp_code, session_id }: VerifyOtpRequest = await req.json();

    if (!phone || !otp_code || !session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone, OTP code, and session_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format phone number
    const formattedPhone = formatBangladeshPhone(phone);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the most recent OTP for this phone and session
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone", formattedPhone)
      .eq("session_id", session_id)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching OTP:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "No OTP found. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "OTP has expired. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempt limit (max 3 attempts)
    if (otpRecord.attempts >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many failed attempts. Please request a new OTP." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otp_code) {
      // Increment attempt counter
      await supabase
        .from("otp_verifications")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      const remainingAttempts = 2 - otpRecord.attempts;
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: remainingAttempts > 0 
            ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
            : "Invalid OTP. No attempts remaining. Please request a new OTP."
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    if (updateError) {
      console.error("Error updating OTP:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Phone number verified successfully",
        verified_phone: formattedPhone,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-otp:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
