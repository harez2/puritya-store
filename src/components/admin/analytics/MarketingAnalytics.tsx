import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Globe, MousePointer, Eye, Link2 } from 'lucide-react';

interface MarketingAnalyticsProps {
  orders: any[];
  visitorSessions: any[];
}

export function MarketingAnalytics({ orders, visitorSessions }: MarketingAnalyticsProps) {
  const stats = useMemo(() => ({
    totalSessions: visitorSessions.length,
    withUtm: visitorSessions.filter(v => v.utm_source).length,
    ordersWithUtm: orders.filter(o => o.utm_source).length,
  }), [visitorSessions, orders]);

  const sessionsOverTime = useMemo(() => {
    const map: Record<string, number> = {};
    visitorSessions.forEach(v => {
      const day = format(parseISO(v.created_at), 'MMM dd');
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([date, sessions]) => ({ date, sessions }));
  }, [visitorSessions]);

  const revenueByUtmSource = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number; sessions: number }> = {};
    orders.forEach(o => {
      const src = o.utm_source || 'Direct';
      if (!map[src]) map[src] = { orders: 0, revenue: 0, sessions: 0 };
      map[src].orders += 1;
      map[src].revenue += Number(o.total);
    });
    visitorSessions.forEach(v => {
      const src = v.utm_source || 'Direct';
      if (!map[src]) map[src] = { orders: 0, revenue: 0, sessions: 0 };
      map[src].sessions += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, data]) => ({ name, ...data, conversionRate: data.sessions > 0 ? ((data.orders / data.sessions) * 100).toFixed(1) : '0' }));
  }, [orders, visitorSessions]);

  const byMedium = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number }> = {};
    orders.forEach(o => {
      const med = o.utm_medium || 'none';
      if (!map[med]) map[med] = { orders: 0, revenue: 0 };
      map[med].orders += 1;
      map[med].revenue += Number(o.total);
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, data]) => ({ name, ...data }));
  }, [orders]);

  const byCampaign = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number }> = {};
    orders.filter(o => o.utm_campaign).forEach(o => {
      const camp = o.utm_campaign;
      if (!map[camp]) map[camp] = { orders: 0, revenue: 0 };
      map[camp].orders += 1;
      map[camp].revenue += Number(o.total);
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, data]) => ({ name, ...data }));
  }, [orders]);

  const topReferrers = useMemo(() => {
    const map: Record<string, number> = {};
    visitorSessions.filter(v => v.referrer).forEach(v => {
      try {
        const host = new URL(v.referrer).hostname;
        map[host] = (map[host] || 0) + 1;
      } catch { map[v.referrer] = (map[v.referrer] || 0) + 1; }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [visitorSessions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Eye className="h-4 w-4" /> Total Sessions</div>
          <p className="text-2xl font-bold mt-1">{stats.totalSessions}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><MousePointer className="h-4 w-4" /> With UTM</div>
          <p className="text-2xl font-bold mt-1">{stats.withUtm}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Globe className="h-4 w-4" /> UTM Orders</div>
          <p className="text-2xl font-bold mt-1">{stats.ordersWithUtm}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Visitor Sessions Over Time</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={sessionsOverTime}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue by UTM Source</CardTitle></CardHeader>
        <CardContent><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {revenueByUtmSource.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.sessions}</TableCell>
                  <TableCell className="text-right">{s.orders}</TableCell>
                  <TableCell className="text-right">{formatPrice(s.revenue)}</TableCell>
                  <TableCell className="text-right">{s.conversionRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div></CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Medium</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byMedium}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(val: number) => formatPrice(val)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Top Referrers</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topReferrers.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>
      </div>

      {byCampaign.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Campaign</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {byCampaign.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.name}</TableCell>
                    <TableCell className="text-right">{c.orders}</TableCell>
                    <TableCell className="text-right">{formatPrice(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>
      )}
    </div>
  );
}
