import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { DollarSign, ShoppingCart, TrendingUp, ArrowUpDown } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface RevenueAnalyticsProps {
  orders: any[];
  orderItems: any[];
  dateRange: { from: Date; to: Date };
}

export function RevenueAnalytics({ orders, orderItems, dateRange }: RevenueAnalyticsProps) {
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalShipping = orders.reduce((sum, o) => sum + Number(o.shipping_fee || 0), 0);
    return { totalRevenue, totalOrders, aov, totalShipping };
  }, [orders]);

  const revenueOverTime = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; orders: number }> = {};
    orders.forEach(o => {
      const day = format(parseISO(o.created_at), 'yyyy-MM-dd');
      if (!map[day]) map[day] = { date: day, revenue: 0, orders: 0 };
      map[day].revenue += Number(o.total);
      map[day].orders += 1;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      label: format(parseISO(d.date), 'MMM dd'),
    }));
  }, [orders]);

  const byPaymentMethod = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const method = o.payment_method || 'Unknown';
      map[method] = (map[method] || 0) + Number(o.total);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const bySource = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    orders.forEach(o => {
      const src = o.order_source || 'cart';
      if (!map[src]) map[src] = { count: 0, revenue: 0 };
      map[src].count += 1;
      map[src].revenue += Number(o.total);
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="h-4 w-4" /> Total Revenue</div>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><ShoppingCart className="h-4 w-4" /> Total Orders</div>
          <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Avg Order Value</div>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.aov)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><ArrowUpDown className="h-4 w-4" /> Total Shipping</div>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.totalShipping)}</p>
        </CardContent></Card>
      </div>

      {/* Revenue Over Time */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue Over Time</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(val: number) => formatPrice(val)} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Payment Method */}
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Payment Method</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                  {byPaymentMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: number) => formatPrice(val)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By Source */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue by Order Source</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">AOV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource.map(s => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium capitalize">{s.name}</TableCell>
                    <TableCell className="text-right">{s.count}</TableCell>
                    <TableCell className="text-right">{formatPrice(s.revenue)}</TableCell>
                    <TableCell className="text-right">{formatPrice(s.count > 0 ? s.revenue / s.count : 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
