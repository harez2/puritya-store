import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, orderId, validationId, successUrl, failUrl, cancelUrl } = await req.json();

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
    if (!gateways.sslcommerz_enabled) {
      return new Response(
        JSON.stringify({ error: 'SSLCommerz gateway is not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const storeId = gateways.sslcommerz_store_id;
    const storePassword = gateways.sslcommerz_store_password;
    const isSandbox = gateways.sslcommerz_sandbox;

    const baseUrl = isSandbox 
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';

    if (action === 'init') {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const shippingAddress = order.shipping_address as {
        full_name?: string;
        phone?: string;
        address_line1?: string;
        city?: string;
        postal_code?: string;
        country?: string;
      };

      // Prepare SSLCommerz init data
      const initData = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,
        total_amount: order.total.toString(),
        currency: 'BDT',
        tran_id: order.order_number,
        success_url: successUrl,
        fail_url: failUrl,
        cancel_url: cancelUrl,
        cus_name: shippingAddress?.full_name || 'Customer',
        cus_email: 'customer@example.com',
        cus_add1: shippingAddress?.address_line1 || 'N/A',
        cus_city: shippingAddress?.city || 'Dhaka',
        cus_postcode: shippingAddress?.postal_code || '1000',
        cus_country: shippingAddress?.country || 'Bangladesh',
        cus_phone: shippingAddress?.phone || '01700000000',
        shipping_method: 'Courier',
        product_name: 'Puritya Order',
        product_category: 'Fashion',
        product_profile: 'physical-goods',
        num_of_item: (order.order_items?.length || 1).toString(),
        ship_name: shippingAddress?.full_name || 'Customer',
        ship_add1: shippingAddress?.address_line1 || 'N/A',
        ship_city: shippingAddress?.city || 'Dhaka',
        ship_postcode: shippingAddress?.postal_code || '1000',
        ship_country: shippingAddress?.country || 'Bangladesh',
      });

      console.log('SSLCommerz Init Request:', initData.toString());

      // Initialize payment
      const initResponse = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: initData.toString(),
      });

      const initResult = await initResponse.json();
      console.log('SSLCommerz Init Response:', initResult);

      if (initResult.status !== 'SUCCESS') {
        return new Response(
          JSON.stringify({ error: initResult.failedreason || 'Failed to initialize payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order status
      await supabase
        .from('orders')
        .update({ 
          payment_status: 'processing',
          notes: `SSLCommerz Session: ${initResult.sessionkey}`
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({
          success: true,
          gatewayPageURL: initResult.GatewayPageURL,
          sessionKey: initResult.sessionkey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'validate') {
      // Validate transaction
      const validateUrl = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${validationId}&store_id=${storeId}&store_passwd=${storePassword}&format=json`;
      
      const validateResponse = await fetch(validateUrl);
      const validateResult = await validateResponse.json();
      console.log('SSLCommerz Validation Response:', validateResult);

      if (validateResult.status !== 'VALID' && validateResult.status !== 'VALIDATED') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Payment validation failed',
            status: validateResult.status 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update order as paid
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', validateResult.tran_id)
        .single();

      if (orderData) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            notes: `SSLCommerz TrxID: ${validateResult.bank_tran_id}, Card: ${validateResult.card_type}`,
          })
          .eq('id', orderData.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: validateResult.bank_tran_id,
          amount: validateResult.amount,
          cardType: validateResult.card_type,
          cardNo: validateResult.card_no,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('SSLCommerz Payment Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
