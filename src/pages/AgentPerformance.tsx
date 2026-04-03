import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, TrendingUp, Package, DollarSign } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';

const datePresets = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: 'All Time', days: -1 },
];

export default function AgentPerformance() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('30 Days');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: myOrders } = await supabase
        .from('orders')
        .select('id, order_number, total, status, created_at, shipping_address, order_source')
        .eq('assigned_agent_id', user!.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      setOrders(myOrders || []);

      if (myOrders && myOrders.length > 0) {
        const ids = myOrders.map(o => o.id);
        const allItems: any[] = [];
        for (let i = 0; i < ids.length; i += 100) {
          const chunk = ids.slice(i, i + 100);
          const { data: items } = await supabase
            .from('order_items')
            .select('order_id, quantity')
            .in('order_id', chunk);
          if (items) allItems.push(...items);
        }
        setOrderItems(allItems);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const preset = datePresets.find(p => p.label === datePreset);
    if (!preset || preset.days < 0) return orders;
    const startDate = preset.days === 0 ? startOfDay(new Date()) : startOfDay(subDays(new Date(), preset.days));
    return orders.filter(o => new Date(o.created_at) >= startDate);
  }, [orders, datePreset]);

  const stats = useMemo(() => {
    const active = filteredOrders.filter(o => !['cancelled', 'returned'].includes(o.status));
    const totalOrders = active.length;
    const totalRevenue = active.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const totalItems = active.reduce((s, o) => {
      return s + orderItems.filter(i => i.order_id === o.id).reduce((ss: number, i: any) => ss + (i.quantity || 0), 0);
    }, 0);
    const avg = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalOrders, totalRevenue, totalItems, avg };
  }, [filteredOrders, orderItems]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  if (authLoading || !user) return null;

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-bold">My Performance</h1>

        {/* Date Filter */}
        <div className="flex gap-1">
          {datePresets.map(p => (
            <Button
              key={p.label}
              variant={datePreset === p.label ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDatePreset(p.label)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                  <p className="text-xs text-muted-foreground">Items Sold</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avg)}</p>
                  <p className="text-xs text-muted-foreground">Avg Order</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No orders found for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>{order.shipping_address?.full_name || order.shipping_address?.fullName || '—'}</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{(order.order_source || '').replace('__silent', '') || '—'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
