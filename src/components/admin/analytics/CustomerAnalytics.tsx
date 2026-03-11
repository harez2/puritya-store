import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserPlus, Repeat, MapPin } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface CustomerAnalyticsProps {
  orders: any[];
}

export function CustomerAnalytics({ orders }: CustomerAnalyticsProps) {
  const customerData = useMemo(() => {
    const map: Record<string, { name: string; phone: string; orders: number; totalSpent: number; city: string; firstOrder: string }> = {};
    
    orders.forEach(o => {
      const addr = o.shipping_address as any;
      const phone = addr?.phone || 'unknown';
      const key = phone;
      if (!map[key]) {
        map[key] = {
          name: addr?.full_name || 'Unknown',
          phone,
          orders: 0,
          totalSpent: 0,
          city: addr?.city || 'Unknown',
          firstOrder: o.created_at,
        };
      }
      map[key].orders += 1;
      map[key].totalSpent += Number(o.total);
      if (o.created_at < map[key].firstOrder) map[key].firstOrder = o.created_at;
    });

    return Object.values(map);
  }, [orders]);

  const stats = useMemo(() => {
    const total = customerData.length;
    const returning = customerData.filter(c => c.orders > 1).length;
    const newCustomers = total - returning;
    const avgOrdersPerCustomer = total > 0 ? orders.length / total : 0;
    const avgLtv = total > 0 ? customerData.reduce((s, c) => s + c.totalSpent, 0) / total : 0;
    return { total, returning, newCustomers, avgOrdersPerCustomer, avgLtv };
  }, [customerData, orders]);

  const topByLtv = useMemo(() => 
    [...customerData].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10), 
  [customerData]);

  const topByOrders = useMemo(() => 
    [...customerData].sort((a, b) => b.orders - a.orders).slice(0, 10), 
  [customerData]);

  const cityBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    customerData.forEach(c => { map[c.city] = (map[c.city] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [customerData]);

  const ltvDistribution = useMemo(() => {
    const buckets = [
      { label: '০-৫০০', min: 0, max: 500, count: 0 },
      { label: '৫০০-২০০০', min: 500, max: 2000, count: 0 },
      { label: '২০০০-৫০০০', min: 2000, max: 5000, count: 0 },
      { label: '৫০০০-১০০০০', min: 5000, max: 10000, count: 0 },
      { label: '১০০০০+', min: 10000, max: Infinity, count: 0 },
    ];
    customerData.forEach(c => {
      const b = buckets.find(b => c.totalSpent >= b.min && c.totalSpent < b.max);
      if (b) b.count++;
    });
    return buckets.map(b => ({ name: b.label, value: b.count }));
  }, [customerData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Total Customers</div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><UserPlus className="h-4 w-4" /> New Customers</div>
          <p className="text-2xl font-bold mt-1">{stats.newCustomers}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Repeat className="h-4 w-4" /> Returning</div>
          <p className="text-2xl font-bold mt-1">{stats.returning}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><MapPin className="h-4 w-4" /> Avg LTV</div>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.avgLtv)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">LTV Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ltvDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Customers by City</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={cityBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => {
                  const t = name.length > 12 ? name.substring(0, 12) + '…' : name;
                  return `${t} ${(percent * 100).toFixed(0)}%`;
                }} labelLine>
                  {cityBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers by LTV</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topByLtv.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right">{formatPrice(c.totalSpent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Customers by Order Count</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topByOrders.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right">{formatPrice(c.totalSpent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>
      </div>
    </div>
  );
}
