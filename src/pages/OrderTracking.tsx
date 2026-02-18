import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  product_image?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  shipping_address: {
    full_name?: string;
    phone?: string;
    address_line1?: string;
    city?: string;
    state?: string;
  };
  order_items: OrderItem[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-5 w-5" />;
    case 'processing':
      return <Package className="h-5 w-5" />;
    case 'shipped':
      return <Truck className="h-5 w-5" />;
    case 'delivered':
      return <CheckCircle className="h-5 w-5" />;
    case 'cancelled':
      return <XCircle className="h-5 w-5" />;
    default:
      return <AlertCircle className="h-5 w-5" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'shipped':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function OrderTracking() {
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<'order_number' | 'phone'>('order_number');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!settings.order_tracking_enabled) {
      navigate('/');
    }
  }, [settings.order_tracking_enabled, navigate]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchValue.trim()) {
      toast.error('Please enter a search value');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('track-order', {
        body: {
          searchType,
          searchValue: searchValue.trim(),
        },
      });

      if (error) throw error;

      setOrders((data?.orders || []) as Order[]);
      
      if (!data?.orders || data.orders.length === 0) {
        toast.info('No orders found matching your search');
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      toast.error('Failed to search orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!settings.order_tracking_enabled) {
    return null;
  }

  return (
    <Layout>
      <Helmet>
        <title>Track Your Order | {settings.store_name}</title>
        <meta name="description" content="Track your order status using your order number or phone number" />
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">
            Enter your order number or phone number to track your order status
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Search Order</CardTitle>
            <CardDescription>
              Find your order using order number or the phone number used during checkout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={searchType === 'order_number' ? 'default' : 'outline'}
                  onClick={() => setSearchType('order_number')}
                  className="flex-1"
                >
                  Order Number
                </Button>
                <Button
                  type="button"
                  variant={searchType === 'phone' ? 'default' : 'outline'}
                  onClick={() => setSearchType('phone')}
                  className="flex-1"
                >
                  Phone Number
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchValue">
                  {searchType === 'order_number' ? 'Order Number' : 'Phone Number'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="searchValue"
                    type={searchType === 'phone' ? 'tel' : 'text'}
                    placeholder={searchType === 'order_number' ? 'e.g., PUR-20260129-1234' : 'e.g., +880 1234-567890'}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searched && (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
                  <p className="text-muted-foreground">
                    We couldn't find any orders matching your search. Please check your {searchType === 'order_number' ? 'order number' : 'phone number'} and try again.
                  </p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{order.order_number}</CardTitle>
                        <CardDescription>
                          Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* Order Status Timeline */}
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Order Status</h4>
                      <div className="flex items-center justify-between relative">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 z-0" />
                        {['pending', 'processing', 'shipped', 'delivered'].map((status, index) => {
                          const isActive = ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status) >= index;
                          const isCancelled = order.status === 'cancelled';
                          return (
                            <div key={status} className="relative z-10 flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isCancelled ? 'bg-red-100 text-red-600' :
                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}>
                                {getStatusIcon(isCancelled && index === 0 ? 'cancelled' : status)}
                              </div>
                              <span className={`text-xs mt-1 capitalize ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Order Details */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-2">Payment Information</h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Method:</span>{' '}
                            <span className="capitalize">{order.payment_method || 'N/A'}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className={getPaymentStatusColor(order.payment_status || 'pending')}>
                              {order.payment_status || 'Pending'}
                            </Badge>
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Delivery Address</h4>
                        <div className="text-sm text-muted-foreground">
                          <p>{order.shipping_address?.full_name}</p>
                          <p>{order.shipping_address?.address_line1}</p>
                          <p>{order.shipping_address?.city}, {order.shipping_address?.state}</p>
                          <p>{order.shipping_address?.phone}</p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Order Items */}
                    <div>
                      <h4 className="font-medium mb-3">Order Items</h4>
                      <div className="space-y-3">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4">
                            {item.product_image && (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity}
                                {item.size && ` • Size: ${item.size}`}
                                {item.color && ` • Color: ${item.color}`}
                              </p>
                            </div>
                            <p className="font-medium">৳{item.price.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Order Summary */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>৳{order.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>৳{order.shipping_fee.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-base">
                        <span>Total</span>
                        <span>৳{order.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
