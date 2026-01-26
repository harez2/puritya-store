import { supabase } from '@/integrations/supabase/client';

interface OrderDetails {
  orderNumber: string;
  customerName: string;
  phone: string;
  total: number;
}

type SmsType = 'confirmation' | 'shipped' | 'delivered';

export function useSendOrderSms() {
  const sendOrderSms = async (order: OrderDetails, type: SmsType = 'confirmation') => {
    try {
      // Fetch SMS settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'sms_settings')
        .maybeSingle();

      const settings = settingsData?.value as {
        enabled?: boolean;
        apiKey?: string;
        senderId?: string;
        useCustomApi?: boolean;
        orderConfirmationTemplate?: string;
        orderShippedTemplate?: string;
        orderDeliveredTemplate?: string;
      } | null;

      // Check if SMS is enabled
      if (!settings?.enabled) {
        console.log('SMS notifications are disabled');
        return { success: false, reason: 'disabled' };
      }

      // Get the appropriate template
      let template = '';
      switch (type) {
        case 'confirmation':
          template = settings.orderConfirmationTemplate || 
            'Dear {customer_name}, your order #{order_number} has been confirmed! Total: ৳{total}. Thank you for shopping with Puritya!';
          break;
        case 'shipped':
          template = settings.orderShippedTemplate || 
            'Dear {customer_name}, your order #{order_number} has been shipped! Track your delivery. - Puritya';
          break;
        case 'delivered':
          template = settings.orderDeliveredTemplate || 
            'Dear {customer_name}, your order #{order_number} has been delivered! Thank you for shopping with Puritya!';
          break;
      }

      // Replace placeholders
      const message = template
        .replace('{customer_name}', order.customerName)
        .replace('{order_number}', order.orderNumber)
        .replace('{total}', order.total.toLocaleString());

      // Prepare request body with custom API credentials if configured
      const requestBody: { 
        phone: string; 
        message: string; 
        customApiKey?: string; 
        customSenderId?: string; 
      } = { 
        phone: order.phone, 
        message 
      };

      if (settings.useCustomApi && settings.apiKey && settings.senderId) {
        requestBody.customApiKey = settings.apiKey;
        requestBody.customSenderId = settings.senderId;
      }

      // Send SMS via edge function
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: requestBody,
      });

      if (error) {
        console.error('Error sending order SMS:', error);
        return { success: false, error };
      }

      console.log('Order SMS sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error in sendOrderSms:', error);
      return { success: false, error };
    }
  };

  return { sendOrderSms };
}
