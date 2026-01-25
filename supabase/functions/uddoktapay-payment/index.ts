import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  action: 'initiate' | 'verify';
  order_id?: string;
  amount?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  invoice_id?: string;
  base_url?: string;
  api_key?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const requestData: PaymentRequest = await req.json();
    const { action, base_url, api_key } = requestData;

    if (!base_url || !api_key) {
      return new Response(
        JSON.stringify({ success: false, message: 'UddoktaPay configuration missing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize base URL
    const normalizedBaseUrl = base_url.endsWith('/') ? base_url.slice(0, -1) : base_url;

    if (action === 'initiate') {
      const { order_id, amount, customer_name, customer_email, customer_phone } = requestData;

      if (!order_id || !amount || !customer_name || !customer_email) {
        return new Response(
          JSON.stringify({ success: false, message: 'Missing required payment parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the origin for redirect URLs
      const origin = req.headers.get('origin') || 'https://puritya-store.lovable.app';

      console.log('Initiating UddoktaPay payment:', { order_id, amount, customer_name });

      // Create payment request to UddoktaPay
      const paymentPayload = {
        full_name: customer_name,
        email: customer_email,
        amount: amount.toString(),
        metadata: {
          order_id: order_id,
          phone: customer_phone || '',
        },
        redirect_url: `${origin}/payment-callback?gateway=uddoktapay&order_id=${order_id}`,
        return_type: 'GET',
        cancel_url: `${origin}/payment-callback?gateway=uddoktapay&order_id=${order_id}&status=cancelled`,
        webhook_url: `${supabaseUrl}/functions/v1/uddoktapay-payment`,
      };

      console.log('UddoktaPay request payload:', paymentPayload);

      const response = await fetch(`${normalizedBaseUrl}/api/checkout-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'RT-UDDOKTAPAY-API-KEY': api_key,
        },
        body: JSON.stringify(paymentPayload),
      });

      const responseData = await response.json();
      console.log('UddoktaPay response:', responseData);

      if (!response.ok || !responseData.status) {
        console.error('UddoktaPay API error:', responseData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: responseData.message || 'Failed to initiate payment' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_url: responseData.payment_url,
          message: 'Payment initiated successfully',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify') {
      const { invoice_id } = requestData;

      if (!invoice_id) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invoice ID is required for verification' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Verifying UddoktaPay payment:', invoice_id);

      const response = await fetch(`${normalizedBaseUrl}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'RT-UDDOKTAPAY-API-KEY': api_key,
        },
        body: JSON.stringify({ invoice_id }),
      });

      const verifyData = await response.json();
      console.log('UddoktaPay verify response:', verifyData);

      if (!response.ok) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: verifyData.message || 'Failed to verify payment' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract order_id from metadata
      const orderId = verifyData.metadata?.order_id;

      // Update order status based on payment status
      if (verifyData.status === 'COMPLETED' && orderId) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'processing'
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('Error updating order:', updateError);
        } else {
          console.log('Order updated successfully:', orderId);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: verifyData.status,
          transaction_id: verifyData.transaction_id,
          payment_method: verifyData.payment_method,
          sender_number: verifyData.sender_number,
          amount: verifyData.amount,
          order_id: orderId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('UddoktaPay payment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Payment processing failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
