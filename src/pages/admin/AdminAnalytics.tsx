import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon, Download, BarChart3 } from 'lucide-react';
import { RevenueAnalytics } from '@/components/admin/analytics/RevenueAnalytics';
import { CustomerAnalytics } from '@/components/admin/analytics/CustomerAnalytics';
import { ProductAnalytics } from '@/components/admin/analytics/ProductAnalytics';
import { InventoryAnalytics } from '@/components/admin/analytics/InventoryAnalytics';
import { MarketingAnalytics } from '@/components/admin/analytics/MarketingAnalytics';

type DatePreset = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

export default function AdminAnalytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const dateRange = useMemo(() => {
    const to = endOfDay(new Date());
    let from: Date;
    switch (datePreset) {
      case '7d': from = startOfDay(subDays(new Date(), 7)); break;
      case '30d': from = startOfDay(subDays(new Date(), 30)); break;
      case '90d': from = startOfDay(subDays(new Date(), 90)); break;
      case '1y': from = startOfDay(subDays(new Date(), 365)); break;
      case 'custom': from = customFrom ? startOfDay(customFrom) : startOfDay(subDays(new Date(), 30)); break;
      default: from = new Date('2020-01-01');
    }
    const finalTo = datePreset === 'custom' && customTo ? endOfDay(customTo) : to;
    return { from, to: finalTo };
  }, [datePreset, customFrom, customTo]);

  const { data: orders = [] } = useQuery({
    queryKey: ['analytics-orders', dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['analytics-order-items', dateRange],
    queryFn: async () => {
      const orderIds = orders.map(o => o.id);
      if (orderIds.length === 0) return [];
      const { data } = await supabase.from('order_items').select('*').in('order_id', orderIds);
      return data || [];
    },
    enabled: orders.length > 0,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['analytics-products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').is('deleted_at', null);
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*');
      return data || [];
    },
  });

  const { data: visitorSessions = [] } = useQuery({
    queryKey: ['analytics-visitors', dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from('visitor_sessions')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      return data || [];
    },
  });

  // Apply filters
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
    if (sourceFilter !== 'all') filtered = filtered.filter(o => (o.order_source || 'cart') === sourceFilter);
    if (categoryFilter !== 'all') {
      const productIds = new Set(products.filter(p => p.category_id === categoryFilter).map(p => p.id));
      const orderIdsWithCategory = new Set(orderItems.filter(i => productIds.has(i.product_id)).map(i => i.order_id));
      filtered = filtered.filter(o => orderIdsWithCategory.has(o.id));
    }
    return filtered;
  }, [orders, statusFilter, sourceFilter, categoryFilter, products, orderItems]);

  const filteredOrderItems = useMemo(() => {
    const orderIds = new Set(filteredOrders.map(o => o.id));
    return orderItems.filter(i => orderIds.has(i.order_id));
  }, [filteredOrders, orderItems]);

  const handleExportCSV = () => {
    const headers = ['Order Number', 'Date', 'Status', 'Total', 'Payment Method', 'Source'];
    const rows = filteredOrders.map(o => [
      o.order_number, format(new Date(o.created_at), 'yyyy-MM-dd'), o.status, o.total, o.payment_method || '', o.order_source || 'cart'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Detailed Analytics</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center bg-muted/50 p-3 rounded-lg border">
          {/* Date Preset */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === 'custom' && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {customFrom ? format(customFrom, 'MMM dd, yyyy') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {customTo ? format(customTo, 'MMM dd, yyyy') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="cart">Cart</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="revenue" className="flex-1 min-w-[100px]">Revenue & Orders</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 min-w-[100px]">Customers</TabsTrigger>
            <TabsTrigger value="products" className="flex-1 min-w-[100px]">Products</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 min-w-[100px]">Inventory</TabsTrigger>
            <TabsTrigger value="marketing" className="flex-1 min-w-[100px]">Marketing</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <RevenueAnalytics orders={filteredOrders} orderItems={filteredOrderItems} dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="customers">
            <CustomerAnalytics orders={filteredOrders} />
          </TabsContent>
          <TabsContent value="products">
            <ProductAnalytics orders={filteredOrders} orderItems={filteredOrderItems} products={products} categories={categories} />
          </TabsContent>
          <TabsContent value="inventory">
            <InventoryAnalytics products={products} categories={categories} orderItems={filteredOrderItems} />
          </TabsContent>
          <TabsContent value="marketing">
            <MarketingAnalytics orders={filteredOrders} visitorSessions={visitorSessions} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
