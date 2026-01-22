import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, TrendingUp, Package, Layers, X, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface OrderWithItems {
  id: string;
  order_number: string;
  total: number;
  subtotal: number;
  status: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Product {
  id: string;
  name: string;
  category_id: string | null;
  images: string[] | null;
}

interface Category {
  id: string;
  name: string;
}

interface TopProduct {
  id: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  image: string | null;
}

interface TopCategory {
  id: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  processing: '#8b5cf6',
  shipped: '#3b82f6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'custom';

export function OrderAnalytics() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering state
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    // Update dates based on preset
    const now = new Date();
    switch (datePreset) {
      case 'today':
        setStartDate(startOfDay(now));
        setEndDate(endOfDay(now));
        break;
      case 'yesterday':
        setStartDate(startOfDay(subDays(now, 1)));
        setEndDate(endOfDay(subDays(now, 1)));
        break;
      case '7days':
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case '30days':
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'lastMonth':
        setStartDate(startOfMonth(subMonths(now, 1)));
        setEndDate(endOfMonth(subMonths(now, 1)));
        break;
    }
  }, [datePreset]);

  async function fetchAnalyticsData() {
    try {
      const [ordersRes, itemsRes, productsRes, categoriesRes] = await Promise.all([
        supabase.from('orders').select('id, order_number, total, subtotal, status, created_at').order('created_at', { ascending: false }),
        supabase.from('order_items').select('id, order_id, product_id, product_name, quantity, price'),
        supabase.from('products').select('id, name, category_id, images'),
        supabase.from('categories').select('id, name'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setOrders(ordersRes.data || []);
      setOrderItems(itemsRes.data || []);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filtered orders based on date range and status
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      let matchesDate = true;
      if (startDate && endDate) {
        matchesDate = isWithinInterval(orderDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        });
      }
      
      return matchesStatus && matchesDate;
    });
  }, [orders, startDate, endDate, statusFilter]);

  // Filter order items to match filtered orders
  const filteredOrderItems = useMemo(() => {
    const orderIds = new Set(filteredOrders.map(o => o.id));
    return orderItems.filter(item => orderIds.has(item.order_id));
  }, [filteredOrders, orderItems]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalItems = filteredOrderItems.reduce((sum, i) => sum + i.quantity, 0);
    
    return { totalRevenue, totalOrders, avgOrderValue, totalItems };
  }, [filteredOrders, filteredOrderItems]);

  // Top products
  const topProducts = useMemo(() => {
    const productMap = new Map<string, TopProduct>();
    
    filteredOrderItems.forEach(item => {
      const existing = productMap.get(item.product_id);
      const product = products.find(p => p.id === item.product_id);
      
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.price * item.quantity;
      } else {
        productMap.set(item.product_id, {
          id: item.product_id,
          name: item.product_name || product?.name || 'Unknown',
          totalQuantity: item.quantity,
          totalRevenue: item.price * item.quantity,
          image: product?.images?.[0] || null,
        });
      }
    });
    
    return Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredOrderItems, products]);

  // Top categories
  const topCategories = useMemo(() => {
    const categoryMap = new Map<string, TopCategory>();
    const orderCategorySet = new Map<string, Set<string>>();
    
    filteredOrderItems.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      const categoryId = product?.category_id || 'uncategorized';
      const category = categories.find(c => c.id === categoryId);
      
      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.price * item.quantity;
        orderCategorySet.get(categoryId)?.add(item.order_id);
      } else {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: category?.name || 'Uncategorized',
          totalQuantity: item.quantity,
          totalRevenue: item.price * item.quantity,
          orderCount: 0,
        });
        orderCategorySet.set(categoryId, new Set([item.order_id]));
      }
    });
    
    // Update order counts
    categoryMap.forEach((cat, id) => {
      cat.orderCount = orderCategorySet.get(id)?.size || 0;
    });
    
    return Array.from(categoryMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredOrderItems, products, categories]);

  // Revenue by day for bar chart
  const revenueByDay = useMemo(() => {
    const dayMap = new Map<string, { date: string; revenue: number; orders: number }>();
    
    filteredOrders.forEach(order => {
      const day = format(new Date(order.created_at), 'MMM d');
      const existing = dayMap.get(day);
      
      if (existing) {
        existing.revenue += Number(order.total);
        existing.orders += 1;
      } else {
        dayMap.set(day, { date: day, revenue: Number(order.total), orders: 1 });
      }
    });
    
    return Array.from(dayMap.values()).slice(-14);
  }, [filteredOrders]);

  // Order status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const statusMap = new Map<string, number>();
    
    filteredOrders.forEach(order => {
      const count = statusMap.get(order.status) || 0;
      statusMap.set(order.status, count + 1);
    });
    
    return Array.from(statusMap.entries()).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status] || '#6b7280',
    }));
  }, [filteredOrders]);

  // Category revenue for pie chart
  const categoryRevenue = useMemo(() => {
    return topCategories.map((cat, index) => ({
      name: cat.name,
      value: cat.totalRevenue,
      color: COLORS[index % COLORS.length],
    }));
  }, [topCategories]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Order Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="lastMonth">Last month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Orders']}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Revenue Pie Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryRevenue.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryRevenue}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Day Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Orders']}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Categories */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No product data</div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="font-bold text-lg text-muted-foreground w-6">#{index + 1}</span>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs">N/A</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.totalQuantity} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No category data</div>
            ) : (
              <div className="space-y-3">
                {topCategories.map((category, index) => (
                  <div key={category.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="font-bold text-lg text-muted-foreground w-6">#{index + 1}</span>
                    <div 
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    >
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.totalQuantity} items • {category.orderCount} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(category.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
