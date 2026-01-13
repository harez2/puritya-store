import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal } = useCart();
  const shippingFee = subtotal > 50000 ? 0 : 3000;

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl mb-4">Please sign in to checkout</h1>
          <Button asChild><Link to="/auth">Sign In</Link></Button>
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
          <h1 className="font-display text-4xl mb-8">Checkout</h1>

          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="font-display text-xl mb-6">Order Summary</h2>
                {items.map(item => (
                  <div key={item.id} className="flex gap-4 py-4 border-b border-border last:border-0">
                    <div className="w-16 h-20 bg-secondary rounded overflow-hidden">
                      {item.product?.images?.[0] && (
                        <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product?.name}</h3>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-medium">{formatPrice(Number(item.product?.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-6 h-fit">
              <h2 className="font-display text-xl mb-6">Order Total</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(subtotal + shippingFee)}</span>
                </div>
              </div>
              <Button className="w-full mt-6" size="lg">
                Complete Order
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Payment integration coming soon
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
