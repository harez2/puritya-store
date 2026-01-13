import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch orders for revenue and count
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_number, total, status, created_at')
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        // Fetch products count
        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true });

        if (productsError) throw productsError;

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
        });

        setRecentOrders(orders?.slice(0, 5) || []);
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
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{order.order_number}</td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(order.total)}
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
