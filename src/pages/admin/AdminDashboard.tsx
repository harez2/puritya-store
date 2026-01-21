import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Package, Users, AlertTriangle, Eye, Zap, ShoppingBag } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
}

interface ShippingAddress {
  full_name?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  order_source: string | null;
  shipping_address: ShippingAddress | null;
  subtotal: number;
  shipping_fee: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  images: string[] | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch orders for revenue and count
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number, total, status, created_at, order_source, shipping_address, subtotal, shipping_fee')
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        // Fetch products count
        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true });

        if (productsError) throw productsError;

        // Fetch low stock products
        const { data: lowStock, error: lowStockError } = await supabase
          .from('products')
          .select('id, name, stock_quantity, low_stock_threshold, images')
          .filter('in_stock', 'eq', true)
          .order('stock_quantity', { ascending: true })
          .limit(10);

        if (lowStockError) throw lowStockError;

        // Filter products where stock is at or below threshold
        const lowStockFiltered = (lowStock || []).filter(
          p => p.stock_quantity <= p.low_stock_threshold
        );

        // Fetch profiles count (customers)
        const { count: customersCount, error: customersError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        if (customersError) throw customersError;

        const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

        setStats({
          totalRevenue,
          totalOrders: orders?.length || 0,
          totalProducts: productsCount || 0,
          totalCustomers: customersCount || 0,
          lowStockCount: lowStockFiltered.length,
        });

        setRecentOrders((orders as RecentOrder[])?.slice(0, 8) || []);
        setLowStockProducts(lowStockFiltered);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'quick_buy':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 gap-1">
            <Zap className="h-3 w-3" />
            Quick
          </Badge>
        );
      case 'cart':
      default:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 gap-1">
            <ShoppingBag className="h-3 w-3" />
            Cart
          </Badge>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your store.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<DollarSign className="h-6 w-6" />}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={<ShoppingCart className="h-6 w-6" />}
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<Package className="h-6 w-6" />}
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={<Users className="h-6 w-6" />}
            trend={{ value: 5.1, isPositive: true }}
          />
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-lg">Low Stock Alert</CardTitle>
                  <span className="px-2 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full">
                    {lowStockProducts.length}
                  </span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/products">View All Products</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lowStockProducts.slice(0, 6).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                  >
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        No img
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-destructive">
                        {product.stock_quantity === 0 
                          ? 'Out of stock' 
                          : `${product.stock_quantity} left (threshold: ${product.low_stock_threshold})`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No orders yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Source</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date & Time</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Quick View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{order.order_number}</td>
                        <td className="py-3 px-2">
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[120px]">
                              {order.shipping_address?.full_name || 'N/A'}
                            </span>
                            {order.shipping_address?.phone && (
                              <span className="text-xs text-muted-foreground">{order.shipping_address.phone}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {getSourceBadge(order.order_source)}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                            <span className="text-xs">{format(new Date(order.created_at), 'h:mm a')}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" align="end">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold">{order.order_number}</h4>
                                  {getSourceBadge(order.order_source)}
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-medium">{order.shipping_address?.full_name || 'N/A'}</span>
                                  </div>
                                  {order.shipping_address?.phone && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Phone:</span>
                                      <span>{order.shipping_address.phone}</span>
                                    </div>
                                  )}
                                  {order.shipping_address?.city && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Location:</span>
                                      <span>{order.shipping_address.city}</span>
                                    </div>
                                  )}
                                  <div className="border-t pt-2 mt-2">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Subtotal:</span>
                                      <span>{formatCurrency(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Shipping:</span>
                                      <span>{formatCurrency(order.shipping_fee)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                      <span>Total:</span>
                                      <span>{formatCurrency(order.total)}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button size="sm" className="w-full" asChild>
                                  <Link to="/admin/orders">View Full Details</Link>
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
