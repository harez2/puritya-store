import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceRequest {
  customApiKey?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customApiKey }: BalanceRequest = await req.json();

    // Use custom API key from request or fall back to environment variable
    const apiKey = customApiKey || Deno.env.get("BULKSMS_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'No API key configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Fetching SMS balance from BulkSMSBD");

    const apiUrl = `http://bulksmsbd.net/api/getBalanceApi?api_key=${apiKey}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    console.log("Balance API Response:", JSON.stringify(data));

    // Response format: { "balance": "XXX.XX" } or error
    if (data.balance !== undefined) {
      return new Response(
        JSON.stringify({ success: true, balance: data.balance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error_message || data.message || 'Failed to fetch balance' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error("Error fetching SMS balance:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
