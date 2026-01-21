import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShoppingBag, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase, Product } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { trackFacebookEvent, FacebookEvents } from '@/lib/facebook-pixel';
import { getUtmParams, clearUtmParams } from '@/hooks/useUtmTracking';

interface QuickCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

type ShippingForm = {
  full_name: string;
  phone: string;
  address: string;
  notes: string;
};

type OrderDetails = {
  orderNumber: string;
  productName: string;
  productImage?: string;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingAddress: {
    full_name: string;
    phone: string;
    address: string;
    location: string;
  };
  paymentMethod: string;
  orderDate: string;
};

export default function QuickCheckoutModal({
  open,
  onOpenChange,
  product,
  quantity,
  size,
  color,
}: QuickCheckoutProps) {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const { toast } = useToast();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  // Get enabled shipping options from settings
  const shippingOptions = (settings.shipping_options || []).filter(opt => opt.enabled);
  const [selectedShipping, setSelectedShipping] = useState(shippingOptions[0]?.id || '');

  // Get enabled payment methods from settings
  const enabledPaymentMethods = (settings.payment_methods || []).filter(m => m.enabled);
  const selectedPaymentMethod = enabledPaymentMethods.find(m => m.type === paymentMethod);

  const [form, setForm] = useState<ShippingForm>({
    full_name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const price = Number(product.price);
  const subtotal = price * quantity;
  const selectedShippingOption = shippingOptions.find(opt => opt.id === selectedShipping);
  
  // Calculate shipping fee with conditions
  const calculateShippingFee = () => {
    if (!selectedShippingOption) return 0;
    
    const basePrice = selectedShippingOption.price;
    
    // Check free shipping threshold first
    if (selectedShippingOption.freeShippingThreshold && subtotal >= selectedShippingOption.freeShippingThreshold) {
      return 0;
    }
    
    // Check discount threshold
    if (selectedShippingOption.discountThreshold && 
        selectedShippingOption.discountAmount && 
        subtotal >= selectedShippingOption.discountThreshold) {
      return Math.max(0, basePrice - selectedShippingOption.discountAmount);
    }
    
    return basePrice;
  };
  
  const shippingFee = calculateShippingFee();
  const originalShippingFee = selectedShippingOption?.price || 0;
  const hasShippingDiscount = shippingFee < originalShippingFee;
  const total = subtotal + shippingFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return false;
    }

    const phoneRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;
    if (!phoneRegex.test(form.phone.replace(/\s/g, ''))) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Bangladesh phone number.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const shippingAddress = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address_line1: form.address.trim(),
        address_line2: null,
        city: selectedShippingOption?.name || 'Unknown',
        state: selectedShippingOption?.name || 'Unknown',
        postal_code: '',
        country: 'Bangladesh',
      };

      const orderNum = 'PUR-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

      const savedOrderDetails: OrderDetails = {
        orderNumber: orderNum,
        productName: product.name,
        productImage: product.images?.[0],
        quantity,
        size,
        color,
        price,
        subtotal,
        shippingFee,
        total,
        shippingAddress: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          location: selectedShippingOption?.name || 'Standard',
        },
        paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bkash' ? 'bKash' : 'Nagad',
        orderDate: new Date().toLocaleString('en-BD', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'Asia/Dhaka',
        }),
      };

      // Get UTM params
      const utmParams = getUtmParams();

      if (user) {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            order_number: orderNum,
            status: 'pending',
            subtotal,
            shipping_fee: shippingFee,
            order_source: 'quick_buy',
            total,
            shipping_address: shippingAddress,
            payment_method: paymentMethod,
            payment_status: 'pending',
            notes: form.notes.trim() || null,
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            utm_campaign: utmParams.utm_campaign,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: product.id,
            product_name: product.name,
            product_image: product.images?.[0] || null,
            quantity,
            size: size || null,
            color: color || null,
            price,
          });

        if (itemsError) throw itemsError;

        savedOrderDetails.orderNumber = order.order_number;
      }

      setOrderDetails(savedOrderDetails);
      clearUtmParams(); // Clear UTM after order is placed
      setStep('success');

      // Track Purchase event
      if (settings.facebook_pixel_id) {
        trackFacebookEvent(
          settings.facebook_pixel_id,
          settings.facebook_capi_enabled,
          settings.facebook_access_token || '',
          FacebookEvents.Purchase,
          {
            content_ids: [product.id],
            content_type: 'product',
            contents: [{ id: product.id, quantity, item_price: price }],
            value: total,
            currency: 'BDT',
            num_items: quantity,
          },
          {
            email: user?.email,
            phone: form.phone.trim(),
            firstName: form.full_name.split(' ')[0],
            lastName: form.full_name.split(' ').slice(1).join(' '),
            externalId: user?.id,
          }
        );
      }

      toast({
        title: "Order Placed!",
        description: `Order ${savedOrderDetails.orderNumber} confirmed.`,
      });
    } catch (error: any) {
      console.error('Error placing order:', error);
      const errorMessage = error?.message || error?.details || "There was an error placing your order. Please try again.";
      toast({
        title: "Order Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setStep('form');
      setForm({ full_name: '', phone: '', address: '', notes: '' });
      setOrderDetails(null);
      setSelectedShipping(shippingOptions[0]?.id || '');
    }, 300);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Quick Checkout</DialogTitle>
              </DialogHeader>

              {/* Product Summary */}
              <div className="flex gap-4 p-4 bg-secondary rounded-lg mt-4">
                <div className="w-20 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {size && `Size: ${size}`} {color && `• ${color}`}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Qty: {quantity}</span>
                    <span className="font-semibold">{formatPrice(price * quantity)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Form */}
              <div className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="quick_full_name">Full Name *</Label>
                  <Input
                    id="quick_full_name"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="quick_phone">Phone Number *</Label>
                  <Input
                    id="quick_phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="01XXXXXXXXX"
                    maxLength={15}
                  />
                </div>

                <div>
                  <Label htmlFor="quick_address">Delivery Address *</Label>
                  <Textarea
                    id="quick_address"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    placeholder="House, Road, Area, City"
                    rows={2}
                    maxLength={500}
                  />
                </div>

                {/* Shipping Location */}
                <div>
                  <Label className="mb-3 block">Delivery Location</Label>
                  <RadioGroup
                    value={selectedShipping}
                    onValueChange={setSelectedShipping}
                    className="flex flex-wrap gap-4"
                  >
                    {shippingOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={`quick_shipping_${option.id}`} />
                        <Label htmlFor={`quick_shipping_${option.id}`} className="cursor-pointer">
                          {option.name} (৳{option.price})
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Payment Method */}
                <div>
                  <Label className="mb-3 block">Payment Method</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="flex flex-wrap gap-4"
                  >
                    {enabledPaymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={method.type} id={`quick_payment_${method.id}`} />
                        <Label htmlFor={`quick_payment_${method.id}`} className="cursor-pointer">
                          {method.name}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {selectedPaymentMethod?.instructions && (
                    <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                      {selectedPaymentMethod.instructions}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="quick_notes">Order Notes (Optional)</Label>
                  <Input
                    id="quick_notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions"
                    maxLength={200}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-border mt-6 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Delivery</span>
                  <div className="flex items-center gap-2">
                    {hasShippingDiscount && (
                      <span className="text-muted-foreground line-through text-xs">
                        {formatPrice(originalShippingFee)}
                      </span>
                    )}
                    <span className={shippingFee === 0 ? 'text-green-600 font-medium' : ''}>
                      {shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}
                    </span>
                  </div>
                </div>
                {hasShippingDiscount && (
                  <p className="text-xs text-green-600">
                    {shippingFee === 0 
                      ? `🎉 Free shipping on orders over ৳${selectedShippingOption?.freeShippingThreshold}!`
                      : `💰 You saved ৳${originalShippingFee - shippingFee} on shipping!`
                    }
                  </p>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Placing Order...' : `Place Order • ${formatPrice(total)}`}
              </Button>

              {!user && (
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Checking out as guest. Sign in for faster checkout next time.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="h-8 w-8 text-green-600" />
              </motion.div>

              <h2 className="font-display text-2xl mb-2">Order Confirmed!</h2>
              <p className="text-muted-foreground mb-6">
                Order #{orderDetails?.orderNumber}
              </p>

              {/* Order Summary */}
              {orderDetails && (
                <div className="bg-secondary rounded-lg p-4 text-left space-y-3 mb-6">
                  <div className="flex gap-3">
                    {orderDetails.productImage && (
                      <img
                        src={orderDetails.productImage}
                        alt=""
                        className="w-16 h-20 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{orderDetails.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {orderDetails.size && `Size: ${orderDetails.size}`} {orderDetails.color && `• ${orderDetails.color}`}
                      </p>
                      <p className="text-sm text-muted-foreground">Qty: {orderDetails.quantity}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery to:</span>
                      <span>{orderDetails.shippingAddress.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{orderDetails.shippingAddress.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <span>{orderDetails.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(orderDetails.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Continue Shopping
                </Button>
                <Button variant="outline" size="icon" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
