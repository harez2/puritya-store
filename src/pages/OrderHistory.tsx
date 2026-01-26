import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, Calendar, CreditCard, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

type OrderItem = {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  size: string | null;
  color: string | null;
  price: number;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  shipping_address: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
  };
  items: OrderItem[];
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  processing: { label: 'Processing', variant: 'default' },
  shipped: { label: 'Shipped', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', className: 'bg-purple-100 text-purple-800' },
};

export default function OrderHistory() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        const ordersWithItems = ordersData.map(order => ({
          ...order,
          shipping_address: order.shipping_address as Order['shipping_address'],
          items: (itemsData || []).filter(item => item.order_id === order.id),
        }));

        setOrders(ordersWithItems);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (loading || !user) {
    return <Layout><div className="container mx-auto px-4 py-20 text-center">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb 
          items={[
            { label: 'My Account', href: '/account' },
            { label: 'Order History' }
          ]} 
          className="mb-6" 
        />
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl mb-8">Order History</h1>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
                <Button onClick={() => navigate('/shop')}>Start Shopping</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isExpanded = expandedOrders.has(order.id);
                const status = statusConfig[order.status] || { label: order.status, variant: 'secondary' as const };
                const paymentStatus = paymentStatusConfig[order.payment_status || 'pending'];

                return (
                  <Collapsible key={order.id} open={isExpanded} onOpenChange={() => toggleOrder(order.id)}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <Package className="h-10 w-10 text-primary shrink-0" />
                              <div>
                                <CardTitle className="text-lg">{order.order_number}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(order.created_at), 'PPP')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant={status.variant}>{status.label}</Badge>
                              <Badge className={paymentStatus.className}>{paymentStatus.label}</Badge>
                              <span className="font-semibold">৳{order.total.toLocaleString()}</span>
                              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="border-t pt-4">
                          {/* Order Items */}
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3">Items</h4>
                            <div className="space-y-3">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-4">
                                  <div className="w-16 h-16 bg-muted rounded-md overflow-hidden shrink-0">
                                    {item.product_image ? (
                                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.product_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Qty: {item.quantity}
                                      {item.size && ` • Size: ${item.size}`}
                                      {item.color && ` • Color: ${item.color}`}
                                    </p>
                                  </div>
                                  <p className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-6">
                            {/* Shipping Address */}
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <Truck className="h-4 w-4" /> Shipping Address
                              </h4>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>{order.shipping_address.full_name}</p>
                                <p>{order.shipping_address.phone}</p>
                                <p>{order.shipping_address.address_line1}</p>
                                {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                              </div>
                            </div>

                            {/* Order Summary */}
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" /> Payment Summary
                              </h4>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span>৳{order.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Shipping</span>
                                  <span>৳{order.shipping_fee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-semibold pt-1 border-t">
                                  <span>Total</span>
                                  <span>৳{order.total.toLocaleString()}</span>
                                </div>
                                {order.payment_method && (
                                  <p className="text-muted-foreground pt-1">
                                    Payment: {order.payment_method}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
