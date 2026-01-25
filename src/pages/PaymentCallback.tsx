import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { usePaymentGateway } from '@/hooks/usePaymentGateway';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { executeBkashPayment, validateSslcommerzPayment, verifyUddoktapayPayment } = usePaymentGateway();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('Processing your payment...');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // Check which gateway is being used
      const gateway = searchParams.get('gateway');
      
      // Check for bKash callback
      const paymentID = searchParams.get('paymentID');
      const bkashStatus = searchParams.get('status');
      
      // Check for SSLCommerz callback
      const valId = searchParams.get('val_id');
      const sslStatus = searchParams.get('status');
      const tranId = searchParams.get('tran_id');

      // Check for UddoktaPay callback
      const invoiceId = searchParams.get('invoice_id');
      const uddoktaStatus = searchParams.get('status');

      if (gateway === 'uddoktapay') {
        // UddoktaPay callback
        if (uddoktaStatus === 'cancelled') {
          setStatus('failed');
          setMessage('Payment was cancelled.');
          return;
        }
        
        if (invoiceId) {
          const result = await verifyUddoktapayPayment(invoiceId);
          if (result.success) {
            setStatus('success');
            setMessage('Payment successful! Your order has been confirmed.');
            setTransactionId(result.transactionId || null);
          } else {
            setStatus('failed');
            setMessage(result.error || 'Payment verification failed.');
          }
        } else {
          setStatus('failed');
          setMessage('Invalid payment callback - missing invoice ID.');
        }
      } else if (paymentID) {
        // bKash callback
        if (bkashStatus === 'success') {
          const result = await executeBkashPayment(paymentID);
          if (result.success) {
            setStatus('success');
            setMessage('Payment successful! Your order has been confirmed.');
            setTransactionId(result.transactionId || null);
          } else {
            setStatus('failed');
            setMessage(result.error || 'Payment verification failed.');
          }
        } else {
          setStatus('failed');
          setMessage('Payment was cancelled or failed.');
        }
      } else if (valId) {
        // SSLCommerz callback
        if (sslStatus === 'VALID' || sslStatus === 'VALIDATED') {
          const result = await validateSslcommerzPayment(valId);
          if (result.success) {
            setStatus('success');
            setMessage('Payment successful! Your order has been confirmed.');
            setTransactionId(result.transactionId || tranId || null);
          } else {
            setStatus('failed');
            setMessage(result.error || 'Payment verification failed.');
          }
        } else {
          setStatus('failed');
          setMessage('Payment was cancelled or failed.');
        }
      } else {
        setStatus('failed');
        setMessage('Invalid payment callback.');
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {status === 'processing' && (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-6" />
              <h1 className="font-display text-2xl mb-2">Processing Payment</h1>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="h-10 w-10 text-green-600" />
              </motion.div>
              <h1 className="font-display text-2xl mb-2">Payment Successful!</h1>
              <p className="text-muted-foreground mb-4">{message}</p>
              {transactionId && (
                <p className="text-sm bg-muted rounded-lg p-3 mb-6">
                  Transaction ID: <span className="font-mono font-medium">{transactionId}</span>
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/account')}>
                  View My Orders
                </Button>
                <Button variant="outline" onClick={() => navigate('/shop')}>
                  Continue Shopping
                </Button>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <XCircle className="h-10 w-10 text-red-600" />
              </motion.div>
              <h1 className="font-display text-2xl mb-2">Payment Failed</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/checkout')}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Go Home
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
