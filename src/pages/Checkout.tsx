import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ShippingForm = {
  full_name: string;
  phone: string;
  address: string;
  notes: string;
};

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clearCart, isGuestCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [shippingLocation, setShippingLocation] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  
  const [form, setForm] = useState<ShippingForm>({
    full_name: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Shipping fees based on location
  const shippingFee = shippingLocation === 'inside_dhaka' ? 60 : 120;
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

      await clearCart();
      setOrderComplete(true);

    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check className="h-10 w-10 text-green-600" />
          </motion.div>
          <h1 className="font-display text-3xl mb-4">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-2">Thank you for shopping with Puritya</p>
          <p className="text-lg font-medium mb-8">Order Number: {orderNumber}</p>
          {!user && (
            <p className="text-sm text-muted-foreground mb-6">
              Create an account to track your orders and enjoy faster checkout next time.
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link to="/shop">Continue Shopping</Link>
            </Button>
            {!user && (
              <Button variant="outline" asChild>
                <Link to="/auth">Create Account</Link>
              </Button>
            )}
          </div>
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
      <div className="container mx-auto px-4 py-12">
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
