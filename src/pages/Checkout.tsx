import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Check, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { trackFacebookEvent, FacebookEvents } from '@/lib/facebook-pixel';
import { getUtmParams, clearUtmParams } from '@/hooks/useUtmTracking';
import {
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  DataLayerProduct,
} from '@/lib/data-layer';

type ShippingForm = {
  full_name: string;
  phone: string;
  address: string;
  notes: string;
};

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clearCart, isGuestCart } = useCart();
  const { settings } = useSiteSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [shippingLocation, setShippingLocation] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDetails, setOrderDetails] = useState<{
    items: typeof items;
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
  } | null>(null);
  
  const [form, setForm] = useState<ShippingForm>({
    full_name: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Shipping fees based on location
  const shippingFee = shippingLocation === 'inside_dhaka' ? 60 : 120;
  const total = subtotal + shippingFee;

  // Helper to create data layer products
  const getDataLayerProducts = (): DataLayerProduct[] => {
    return items.map((item, index) => ({
      item_id: item.product_id,
      item_name: item.product?.name || 'Unknown',
      price: Number(item.product?.price) || 0,
      quantity: item.quantity,
      item_category: item.product?.category?.name,
      item_variant: [item.size, item.color].filter(Boolean).join(' / ') || undefined,
      index,
    }));
  };

  // Track InitiateCheckout/begin_checkout when page loads with items
  useEffect(() => {
    if (items.length > 0) {
      // Track begin_checkout in data layer
      const dataLayerProducts = getDataLayerProducts();
      trackBeginCheckout(dataLayerProducts, subtotal, 'BDT');
      
      // Track Facebook InitiateCheckout
      if (settings.facebook_pixel_id) {
        trackFacebookEvent(
          settings.facebook_pixel_id,
          settings.facebook_capi_enabled,
          settings.facebook_access_token || '',
          FacebookEvents.InitiateCheckout,
          {
            content_ids: items.map(item => item.product_id),
            content_type: 'product',
            contents: items.map(item => ({
              id: item.product_id,
              quantity: item.quantity,
              item_price: Number(item.product?.price) || 0,
            })),
            value: subtotal,
            currency: 'BDT',
            num_items: items.reduce((sum, item) => sum + item.quantity, 0),
          }
        );
      }
    }
  }, []); // Only track once on mount

  // Track shipping info when location changes
  useEffect(() => {
    if (items.length > 0 && form.address.trim()) {
      const dataLayerProducts = getDataLayerProducts();
      const shippingTier = shippingLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';
      trackAddShippingInfo(dataLayerProducts, total, shippingTier, 'BDT');
    }
  }, [shippingLocation, form.address]);

  // Track payment info when payment method changes
  useEffect(() => {
    if (items.length > 0) {
      const dataLayerProducts = getDataLayerProducts();
      const paymentType = paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bkash' ? 'bKash' : 'Nagad';
      trackAddPaymentInfo(dataLayerProducts, total, paymentType, 'BDT');
    }
  }, [paymentMethod]);

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
    
    // Validate Bangladesh phone number
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
        city: shippingLocation === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
        state: shippingLocation === 'inside_dhaka' ? 'Dhaka Division' : 'Other',
        postal_code: '',
        country: 'Bangladesh',
      };

      // Generate order number
      const orderNum = 'PUR-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000);

      // Store order details for confirmation page before clearing cart
      const savedOrderDetails = {
        items: [...items],
        subtotal,
        shippingFee,
        total,
        shippingAddress: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          location: shippingLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        },
        paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bkash' ? 'bKash' : 'Nagad',
        orderDate: new Date().toLocaleString('en-BD', { 
          dateStyle: 'long', 
          timeStyle: 'short',
          timeZone: 'Asia/Dhaka'
        }),
      };

      // Get UTM params
      const utmParams = getUtmParams();

      if (user) {
        // Logged-in user: save to database
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            order_number: orderNum,
            status: 'pending',
            subtotal,
            shipping_fee: shippingFee,
            total,
            shipping_address: shippingAddress,
            payment_method: paymentMethod,
            payment_status: 'pending',
            notes: form.notes.trim() || null,
            order_source: 'cart',
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            utm_campaign: utmParams.utm_campaign,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Add order items
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product?.name || 'Unknown Product',
          product_image: item.product?.images?.[0] || null,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          price: Number(item.product?.price) || 0,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        setOrderNumber(order.order_number);
      } else {
        // Guest checkout: just show confirmation
        setOrderNumber(orderNum);
      }

      setOrderDetails(savedOrderDetails);
      await clearCart();
      clearUtmParams(); // Clear UTM after order is placed
      setOrderComplete(true);

      // Track Purchase event in Data Layer
      const dataLayerProducts = getDataLayerProducts();
      trackPurchase(
        user ? orderNumber : orderNum,
        dataLayerProducts,
        total,
        shippingFee,
        0, // tax
        'BDT'
      );

      // Track Purchase event in Facebook Pixel
      if (settings.facebook_pixel_id) {
        trackFacebookEvent(
          settings.facebook_pixel_id,
          settings.facebook_capi_enabled,
          settings.facebook_access_token || '',
          FacebookEvents.Purchase,
          {
            content_ids: items.map(item => item.product_id),
            content_type: 'product',
            contents: items.map(item => ({
              id: item.product_id,
              quantity: item.quantity,
              item_price: Number(item.product?.price) || 0,
            })),
            value: total,
            currency: 'BDT',
            num_items: items.reduce((sum, item) => sum + item.quantity, 0),
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


  const handlePrint = () => {
    window.print();
  };

  if (orderComplete && orderDetails) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="print:shadow-none"
          >
            {/* Success Header */}
            <div className="text-center mb-8 print:mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="h-8 w-8 text-green-600" />
              </motion.div>
              <h1 className="font-display text-3xl mb-2">Order Confirmed!</h1>
              <p className="text-muted-foreground">Thank you for shopping with Puritya</p>
            </div>

            {/* Invoice Card */}
            <div className="print-invoice bg-card border border-border rounded-lg overflow-hidden print:border-2">
              {/* Company Branding - Print Only */}
              <div className="hidden print:block px-6 py-6 border-b border-border text-center">
                <h1 className="font-display text-3xl font-bold tracking-tight">Puritya</h1>
                <p className="text-sm text-muted-foreground mt-1">Premium Fashion & Lifestyle</p>
                <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>📞 +880 1XXX-XXXXXX</span>
                  <span>✉️ support@puritya.com</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">www.puritya.com</p>
              </div>

              {/* Invoice Header */}
              <div className="bg-primary/5 px-6 py-4 border-b border-border flex justify-between items-start print:bg-transparent">
                <div>
                  <h2 className="font-display text-xl font-semibold">Order Invoice</h2>
                  <p className="text-sm text-muted-foreground mt-1">Order #: {orderNumber}</p>
                  <p className="text-sm text-muted-foreground">Date: {orderDetails.orderDate}</p>
                </div>
                <div className="print:hidden">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              </div>

              {/* Customer & Shipping Info */}
              <div className="grid md:grid-cols-2 gap-6 p-6 border-b border-border">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Shipping To</h3>
                  <p className="font-medium">{orderDetails.shippingAddress.full_name}</p>
                  <p className="text-sm text-muted-foreground">{orderDetails.shippingAddress.phone}</p>
                  <p className="text-sm text-muted-foreground mt-1">{orderDetails.shippingAddress.address}</p>
                  <p className="text-sm text-muted-foreground">{orderDetails.shippingAddress.location}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Payment Method</h3>
                  <p className="font-medium">{orderDetails.paymentMethod}</p>
                  <p className="text-sm text-muted-foreground mt-1">Status: Pending</p>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="p-6 border-b border-border">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Product</th>
                        <th className="text-center py-2 font-medium">Qty</th>
                        <th className="text-right py-2 font-medium">Price</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.items.map((item, index) => (
                        <tr key={index} className="border-b border-border/50">
                          <td className="py-3">
                            <div className="flex gap-3 items-center">
                              <div className="w-12 h-12 bg-secondary rounded overflow-hidden flex-shrink-0 print:hidden">
                                {item.product?.images?.[0] && (
                                  <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{item.product?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.size && `Size: ${item.size}`} {item.color && `• ${item.color}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-center">{item.quantity}</td>
                          <td className="py-3 text-right">{formatPrice(Number(item.product?.price))}</td>
                          <td className="py-3 text-right font-medium">{formatPrice(Number(item.product?.price) * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-6">
                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(orderDetails.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery ({orderDetails.shippingAddress.location})</span>
                      <span>{formatPrice(orderDetails.shippingFee)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(orderDetails.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest CTA */}
            {!user && (
              <p className="text-sm text-muted-foreground text-center mt-6 print:hidden">
                Create an account to track your orders and enjoy faster checkout next time.
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center mt-8 print:hidden">
              <Button asChild>
                <Link to="/shop">Continue Shopping</Link>
              </Button>
              {!user && (
                <Button variant="outline" asChild>
                  <Link to="/auth">Create Account</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-3xl mb-4">Your cart is empty</h1>
          <Button asChild><Link to="/shop">Continue Shopping</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb items={[{ label: 'Cart', href: '/shop' }, { label: 'Checkout' }]} className="mb-6" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl mb-2">Checkout</h1>
          {isGuestCart && (
            <p className="text-muted-foreground mb-8">
              Checking out as guest.{' '}
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> for faster checkout.
            </p>
          )}

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Information */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-display text-xl mb-6">Shipping Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={form.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      placeholder="01XXXXXXXXX"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleInputChange}
                      placeholder="House, Road, Area, Thana, District"
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Location */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-display text-xl mb-6">Shipping Location</h2>
                <RadioGroup value={shippingLocation} onValueChange={(val) => setShippingLocation(val as 'inside_dhaka' | 'outside_dhaka')}>
                  <div className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${shippingLocation === 'inside_dhaka' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="inside_dhaka" id="inside_dhaka" />
                      <Label htmlFor="inside_dhaka" className="cursor-pointer">
                        <span className="font-medium">Inside Dhaka</span>
                      </Label>
                    </div>
                    <span className="font-semibold">৳60</span>
                  </div>
                  <div className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors mt-3 ${shippingLocation === 'outside_dhaka' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="outside_dhaka" id="outside_dhaka" />
                      <Label htmlFor="outside_dhaka" className="cursor-pointer">
                        <span className="font-medium">Outside Dhaka</span>
                      </Label>
                    </div>
                    <span className="font-semibold">৳120</span>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Method */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-display text-xl mb-6">Payment Method</h2>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      <span className="font-medium">Cash on Delivery</span>
                      <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors mt-3 ${paymentMethod === 'bkash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
                    <RadioGroupItem value="bkash" id="bkash" />
                    <Label htmlFor="bkash" className="flex-1 cursor-pointer">
                      <span className="font-medium">bKash</span>
                      <p className="text-sm text-muted-foreground">Pay via bKash mobile banking</p>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors mt-3 ${paymentMethod === 'nagad' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}>
                    <RadioGroupItem value="nagad" id="nagad" />
                    <Label htmlFor="nagad" className="flex-1 cursor-pointer">
                      <span className="font-medium">Nagad</span>
                      <p className="text-sm text-muted-foreground">Pay via Nagad mobile banking</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Order Notes */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-display text-xl mb-6">Order Notes (Optional)</h2>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  placeholder="Any special instructions for your order..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-secondary rounded-lg p-6 sticky top-24">
                <h2 className="font-display text-xl mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-14 h-16 bg-background rounded overflow-hidden flex-shrink-0">
                        {item.product?.images?.[0] && (
                          <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{item.product?.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.size && `Size: ${item.size}`} {item.color && `• ${item.color}`}
                        </p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPrice(Number(item.product?.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 text-sm border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery ({shippingLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span>
                    <span>৳{shippingFee}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center mt-4">
                  By placing your order, you agree to our Terms & Conditions
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
