import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BkashTokenResponse {
  statusCode: string;
  statusMessage: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

interface BkashCreatePaymentResponse {
  statusCode?: string;
  statusMessage?: string;
  paymentID?: string;
  bkashURL?: string;
  amount?: string;
  intent?: string;
  merchantInvoiceNumber?: string;
}

interface BkashExecutePaymentResponse {
  statusCode?: string;
  statusMessage?: string;
  paymentID?: string;
  trxID?: string;
  amount?: string;
  transactionStatus?: string;
  merchantInvoiceNumber?: string;
  customerMsisdn?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, orderId, paymentId, callbackUrl } = await req.json();

    // Fetch gateway config from site_settings
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'payment_gateways')
      .single();

    if (!settingsData?.value) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gateways = settingsData.value;
    if (!gateways.bkash_enabled) {
      return new Response(
        JSON.stringify({ error: 'bKash gateway is not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appKey = gateways.bkash_app_key;
    const appSecret = gateways.bkash_app_secret;
    const isSandbox = gateways.bkash_sandbox;

    const baseUrl = isSandbox 
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    // Get access token
    const getToken = async (): Promise<string> => {
      const tokenResponse = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'username': appKey,
          'password': appSecret,
        },
        body: JSON.stringify({
          app_key: appKey,
          app_secret: appSecret,
        }),
      });

      const tokenData: BkashTokenResponse = await tokenResponse.json();
      console.log('bKash Token Response:', tokenData);

      if (tokenData.statusCode !== '0000' || !tokenData.id_token) {
        throw new Error(tokenData.statusMessage || 'Failed to get bKash token');
      }

      return tokenData.id_token;
    };

    if (action === 'create') {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = await getToken();

      // Create payment
      const createResponse = await fetch(`${baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token,
          'X-APP-Key': appKey,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: order.user_id || 'guest',
          callbackURL: callbackUrl,
          amount: order.total.toString(),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: order.order_number,
        }),
      });

      const createData: BkashCreatePaymentResponse = await createResponse.json();
      console.log('bKash Create Response:', createData);

      if (createData.statusCode !== '0000' || !createData.bkashURL) {
        return new Response(
          JSON.stringify({ error: createData.statusMessage || 'Failed to create payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order with payment ID
      await supabase
        .from('orders')
        .update({ 
          payment_status: 'processing',
          notes: `bKash Payment ID: ${createData.paymentID}`
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: createData.paymentID,
          redirectUrl: createData.bkashURL,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'execute') {
      const token = await getToken();

      // Execute payment
      const executeResponse = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token,
          'X-APP-Key': appKey,
        },
        body: JSON.stringify({ paymentID: paymentId }),
      });

      const executeData: BkashExecutePaymentResponse = await executeResponse.json();
      console.log('bKash Execute Response:', executeData);

      if (executeData.statusCode !== '0000' || executeData.transactionStatus !== 'Completed') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: executeData.statusMessage || 'Payment not completed' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order as paid
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', executeData.merchantInvoiceNumber)
        .single();

      if (orderData) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            notes: `bKash TrxID: ${executeData.trxID}, Customer: ${executeData.customerMsisdn}`,
          })
          .eq('id', orderData.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: executeData.trxID,
          amount: executeData.amount,
          customerPhone: executeData.customerMsisdn,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('bKash Payment Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
