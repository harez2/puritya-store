import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  transactionId?: string;
}

export function usePaymentGateway() {
  const { settings } = useSiteSettings();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const gateways = settings.payment_gateways;

  const isBkashEnabled = gateways?.bkash_enabled && gateways?.bkash_app_key && gateways?.bkash_app_secret;
  const isSslcommerzEnabled = gateways?.sslcommerz_enabled && gateways?.sslcommerz_store_id && gateways?.sslcommerz_store_password;

  const getDefaultGateway = (): 'bkash' | 'sslcommerz' | null => {
    if (gateways?.bkash_is_default && isBkashEnabled) return 'bkash';
    if (gateways?.sslcommerz_is_default && isSslcommerzEnabled) return 'sslcommerz';
    if (isBkashEnabled) return 'bkash';
    if (isSslcommerzEnabled) return 'sslcommerz';
    return null;
  };

  const initiateBkashPayment = async (orderId: string, callbackUrl: string): Promise<PaymentResult> => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('bkash-payment', {
        body: {
          action: 'create',
          orderId,
          callbackUrl,
        },
      });

      if (error) throw error;
      
      if (data?.success && data?.redirectUrl) {
        return {
          success: true,
          redirectUrl: data.redirectUrl,
        };
      }

      return {
        success: false,
        error: data?.error || 'Failed to initiate bKash payment',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment initiation failed';
      toast({
        title: 'Payment Error',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setProcessing(false);
    }
  };

  const executeBkashPayment = async (paymentId: string): Promise<PaymentResult> => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('bkash-payment', {
        body: {
          action: 'execute',
          paymentId,
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        return {
          success: true,
          transactionId: data.transactionId,
        };
      }

      return {
        success: false,
        error: data?.error || 'Payment execution failed',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      return { success: false, error: message };
    } finally {
      setProcessing(false);
    }
  };

  const initiateSslcommerzPayment = async (
    orderId: string,
    successUrl: string,
    failUrl: string,
    cancelUrl: string
  ): Promise<PaymentResult> => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('sslcommerz-payment', {
        body: {
          action: 'init',
          orderId,
          successUrl,
          failUrl,
          cancelUrl,
        },
      });

      if (error) throw error;
      
      if (data?.success && data?.gatewayPageURL) {
        return {
          success: true,
          redirectUrl: data.gatewayPageURL,
        };
      }

      return {
        success: false,
        error: data?.error || 'Failed to initiate SSLCommerz payment',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment initiation failed';
      toast({
        title: 'Payment Error',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setProcessing(false);
    }
  };

  const validateSslcommerzPayment = async (validationId: string): Promise<PaymentResult> => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('sslcommerz-payment', {
        body: {
          action: 'validate',
          validationId,
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        return {
          success: true,
          transactionId: data.transactionId,
        };
      }

      return {
        success: false,
        error: data?.error || 'Payment validation failed',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment validation failed';
      return { success: false, error: message };
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    isBkashEnabled,
    isSslcommerzEnabled,
    getDefaultGateway,
    initiateBkashPayment,
    executeBkashPayment,
    initiateSslcommerzPayment,
    validateSslcommerzPayment,
  };
}
