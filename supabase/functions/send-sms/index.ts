import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  phone: string;
  message: string;
  customApiKey?: string;
  customSenderId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, customApiKey, customSenderId }: SMSRequest = await req.json();

    // Use custom API credentials if provided, otherwise fall back to environment variables
    const apiKey = customApiKey || Deno.env.get("BULKSMS_API_KEY");
    const senderId = customSenderId || Deno.env.get("BULKSMS_SENDER_ID");

    if (!apiKey || !senderId) {
      console.error("Missing SMS API credentials");
      throw new Error("SMS API credentials not configured. Please add API key and Sender ID in Settings.");
    }

    if (!phone || !message) {
      throw new Error("Phone number and message are required");
    }

    // Format phone number - ensure it starts with 880 for Bangladesh
    let formattedPhone = phone.replace(/\D/g, ""); // Remove non-digits
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "88" + formattedPhone;
    } else if (!formattedPhone.startsWith("880")) {
      formattedPhone = "880" + formattedPhone;
    }

    // URL encode the message for special characters
    const encodedMessage = encodeURIComponent(message);

    // Build the API URL
    const apiUrl = `http://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${formattedPhone}&senderid=${senderId}&message=${encodedMessage}`;

    console.log(`Sending SMS to ${formattedPhone}`);

    const response = await fetch(apiUrl, {
      method: "GET",
    });

    const responseText = await response.text();
    console.log("SMS API Response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { response: responseText };
    }

    if (!response.ok) {
      throw new Error(`SMS API error: ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
