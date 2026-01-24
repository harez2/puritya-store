import { useEffect, useState, useMemo, useCallback } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subMonths, differenceInDays, subYears } from 'date-fns';
import { CalendarIcon, TrendingUp, TrendingDown, Package, Layers, X, BarChart3, ArrowUp, ArrowDown, Minus, Megaphone, Globe, Facebook, Mail, Search, Users, MousePointerClick, Target, Download, FileText, FileSpreadsheet, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

interface UtmSourceData {
  source: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

interface UtmCampaignData {
  campaign: string;
  source: string;
  orders: number;
  revenue: number;
}

interface VisitorSession {
  id: string;
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

interface ConversionData {
  source: string;
  visitors: number;
  orders: number;
  conversionRate: number;
  revenue: number;
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
type ComparisonType = 'previous_period' | 'previous_month' | 'previous_year' | 'custom';

export function OrderAnalytics() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [visitorSessions, setVisitorSessions] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering state - default to today
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfDay(new Date()));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showComparison, setShowComparison] = useState(true);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('previous_period');
  const [customCompareStart, setCustomCompareStart] = useState<Date | undefined>();
  const [customCompareEnd, setCustomCompareEnd] = useState<Date | undefined>();

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
      const [ordersRes, itemsRes, productsRes, categoriesRes, visitorsRes] = await Promise.all([
        supabase.from('orders').select('id, order_number, total, subtotal, status, created_at, utm_source, utm_medium, utm_campaign').order('created_at', { ascending: false }),
        supabase.from('order_items').select('id, order_id, product_id, product_name, quantity, price'),
        supabase.from('products').select('id, name, category_id, images'),
        supabase.from('categories').select('id, name'),
        supabase.from('visitor_sessions').select('id, session_id, utm_source, utm_medium, utm_campaign, created_at'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (visitorsRes.error) throw visitorsRes.error;

      setOrders(ordersRes.data || []);
      setOrderItems(itemsRes.data || []);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setVisitorSessions(visitorsRes.data || []);
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

  // Filtered visitors based on date range
  const filteredVisitors = useMemo(() => {
    return visitorSessions.filter(session => {
      const sessionDate = new Date(session.created_at);
      
      let matchesDate = true;
      if (startDate && endDate) {
        matchesDate = isWithinInterval(sessionDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        });
      }
      
      return matchesDate;
    });
  }, [visitorSessions, startDate, endDate]);

  // Calculate previous period date range for comparison based on comparison type
  const previousPeriodDates = useMemo(() => {
    if (!startDate || !endDate) return { start: undefined, end: undefined };
    
    switch (comparisonType) {
      case 'previous_period': {
        const periodLength = differenceInDays(endDate, startDate) + 1;
        const prevEnd = subDays(startDate, 1);
        const prevStart = subDays(prevEnd, periodLength - 1);
        return { start: prevStart, end: prevEnd };
      }
      case 'previous_month': {
        const prevStart = subMonths(startDate, 1);
        const prevEnd = subMonths(endDate, 1);
        return { start: prevStart, end: prevEnd };
      }
      case 'previous_year': {
        const prevStart = subYears(startDate, 1);
        const prevEnd = subYears(endDate, 1);
        return { start: prevStart, end: prevEnd };
      }
      case 'custom': {
        return { start: customCompareStart, end: customCompareEnd };
      }
      default:
        return { start: undefined, end: undefined };
    }
  }, [startDate, endDate, comparisonType, customCompareStart, customCompareEnd]);

  // Filter orders for previous period
  const previousPeriodOrders = useMemo(() => {
    if (!previousPeriodDates.start || !previousPeriodDates.end) return [];
    
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesDate = isWithinInterval(orderDate, {
        start: startOfDay(previousPeriodDates.start!),
        end: endOfDay(previousPeriodDates.end!),
      });
      
      return matchesStatus && matchesDate;
    });
  }, [orders, previousPeriodDates, statusFilter]);

  // Filter order items for previous period
  const previousPeriodOrderItems = useMemo(() => {
    const orderIds = new Set(previousPeriodOrders.map(o => o.id));
    return orderItems.filter(item => orderIds.has(item.order_id));
  }, [previousPeriodOrders, orderItems]);

  // Calculate stats for current period
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalItems = filteredOrderItems.reduce((sum, i) => sum + i.quantity, 0);
    
    return { totalRevenue, totalOrders, avgOrderValue, totalItems };
  }, [filteredOrders, filteredOrderItems]);

  // Calculate stats for previous period
  const previousStats = useMemo(() => {
    const totalRevenue = previousPeriodOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = previousPeriodOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalItems = previousPeriodOrderItems.reduce((sum, i) => sum + i.quantity, 0);
    
    return { totalRevenue, totalOrders, avgOrderValue, totalItems };
  }, [previousPeriodOrders, previousPeriodOrderItems]);

  // Calculate percentage changes
  const percentageChanges = useMemo(() => {
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      revenue: calculateChange(stats.totalRevenue, previousStats.totalRevenue),
      orders: calculateChange(stats.totalOrders, previousStats.totalOrders),
      avgOrder: calculateChange(stats.avgOrderValue, previousStats.avgOrderValue),
      items: calculateChange(stats.totalItems, previousStats.totalItems),
    };
  }, [stats, previousStats]);

  // Helper function to get comparison label
  const getComparisonLabel = () => {
    switch (comparisonType) {
      case 'previous_period':
        return 'vs prev period';
      case 'previous_month':
        return 'vs last month';
      case 'previous_year':
        return 'vs last year';
      case 'custom':
        return 'vs custom';
      default:
        return 'vs prev period';
    }
  };

  // Helper to render change indicator
  const ChangeIndicator = ({ value, prefix = '' }: { value: number; prefix?: string }) => {
    if (!showComparison) return null;
    
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium mt-1",
        isPositive && "text-green-600 dark:text-green-400",
        !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
        isNeutral && "text-muted-foreground"
      )}>
        {isPositive ? (
          <ArrowUp className="h-3 w-3" />
        ) : isNeutral ? (
          <Minus className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
        <span>{prefix}{Math.abs(value).toFixed(1)}%</span>
        <span className="text-muted-foreground font-normal">{getComparisonLabel()}</span>
      </div>
    );
  };

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

  // UTM Source analytics
  const utmSourceData = useMemo(() => {
    const sourceMap = new Map<string, { orders: number; revenue: number }>();
    
    filteredOrders.forEach(order => {
      const source = order.utm_source || 'Direct / Organic';
      const existing = sourceMap.get(source);
      
      if (existing) {
        existing.orders += 1;
        existing.revenue += Number(order.total);
      } else {
        sourceMap.set(source, { orders: 1, revenue: Number(order.total) });
      }
    });
    
    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        orders: data.orders,
        revenue: data.revenue,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredOrders]);

  // UTM Campaign analytics
  const utmCampaignData = useMemo(() => {
    const campaignMap = new Map<string, { source: string; orders: number; revenue: number }>();
    
    filteredOrders.forEach(order => {
      if (order.utm_campaign) {
        const existing = campaignMap.get(order.utm_campaign);
        
        if (existing) {
          existing.orders += 1;
          existing.revenue += Number(order.total);
        } else {
          campaignMap.set(order.utm_campaign, {
            source: order.utm_source || 'Unknown',
            orders: 1,
            revenue: Number(order.total),
          });
        }
      }
    });
    
    return Array.from(campaignMap.entries())
      .map(([campaign, data]) => ({
        campaign,
        source: data.source,
        orders: data.orders,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // UTM source for pie chart
  const utmSourceChartData = useMemo(() => {
    return utmSourceData.slice(0, 5).map((data, index) => ({
      name: data.source,
      value: data.revenue,
      color: COLORS[index % COLORS.length],
    }));
  }, [utmSourceData]);

  // Conversion rate data by source
  const conversionData = useMemo(() => {
    const sourceMap = new Map<string, { visitors: number; orders: number; revenue: number }>();
    
    // Count unique sessions (visitors) per source
    filteredVisitors.forEach(session => {
      const source = session.utm_source || 'Direct / Organic';
      const existing = sourceMap.get(source);
      
      if (existing) {
        existing.visitors += 1;
      } else {
        sourceMap.set(source, { visitors: 1, orders: 0, revenue: 0 });
      }
    });
    
    // Count orders per source
    filteredOrders.forEach(order => {
      const source = order.utm_source || 'Direct / Organic';
      const existing = sourceMap.get(source);
      
      if (existing) {
        existing.orders += 1;
        existing.revenue += Number(order.total);
      } else {
        sourceMap.set(source, { visitors: 0, orders: 1, revenue: Number(order.total) });
      }
    });
    
    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        visitors: data.visitors,
        orders: data.orders,
        conversionRate: data.visitors > 0 ? (data.orders / data.visitors) * 100 : 0,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .filter(d => d.visitors > 0 || d.orders > 0);
  }, [filteredVisitors, filteredOrders]);

  // Overall conversion stats
  const overallConversion = useMemo(() => {
    const totalVisitors = filteredVisitors.length;
    const totalOrders = filteredOrders.length;
    const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;
    
    return { totalVisitors, totalOrders, conversionRate };
  }, [filteredVisitors, filteredOrders]);

  // Helper to get source icon
  const getSourceIcon = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('facebook') || lowerSource.includes('fb')) {
      return <Facebook className="h-4 w-4 text-blue-600" />;
    }
    if (lowerSource.includes('google')) {
      return <Search className="h-4 w-4 text-red-500" />;
    }
    if (lowerSource.includes('email') || lowerSource.includes('newsletter')) {
      return <Mail className="h-4 w-4 text-green-600" />;
    }
    if (lowerSource === 'Direct / Organic') {
      return <Globe className="h-4 w-4 text-muted-foreground" />;
    }
    return <Megaphone className="h-4 w-4 text-purple-600" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyPlain = (amount: number) => {
    return `BDT ${amount.toLocaleString('en-BD', { minimumFractionDigits: 0 })}`;
  };

  // Export to CSV
  const exportToCSV = useCallback(() => {
    try {
      const dateRange = startDate && endDate 
        ? `${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}`
        : 'all-time';
      
      // Summary data
      let csvContent = 'ANALYTICS REPORT\n';
      csvContent += `Period,${startDate ? format(startDate, 'MMM d, yyyy') : 'All'} - ${endDate ? format(endDate, 'MMM d, yyyy') : 'All'}\n`;
      csvContent += `Generated,${format(new Date(), 'MMM d, yyyy HH:mm')}\n\n`;
      
      // KPI Summary
      csvContent += 'KEY METRICS\n';
      csvContent += 'Metric,Value,Change vs Previous\n';
      csvContent += `Total Revenue,${formatCurrencyPlain(stats.totalRevenue)},${percentageChanges.revenue.toFixed(1)}%\n`;
      csvContent += `Total Orders,${stats.totalOrders},${percentageChanges.orders.toFixed(1)}%\n`;
      csvContent += `Average Order Value,${formatCurrencyPlain(stats.avgOrderValue)},${percentageChanges.avgOrder.toFixed(1)}%\n`;
      csvContent += `Items Sold,${stats.totalItems},${percentageChanges.items.toFixed(1)}%\n\n`;
      
      // Conversion Stats
      csvContent += 'CONVERSION FUNNEL\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Visitors,${overallConversion.totalVisitors}\n`;
      csvContent += `Total Conversions,${overallConversion.totalOrders}\n`;
      csvContent += `Conversion Rate,${overallConversion.conversionRate.toFixed(2)}%\n\n`;
      
      // Top Products
      csvContent += 'TOP PRODUCTS\n';
      csvContent += 'Rank,Product Name,Quantity Sold,Revenue\n';
      topProducts.forEach((product, index) => {
        csvContent += `${index + 1},"${product.name}",${product.totalQuantity},${formatCurrencyPlain(product.totalRevenue)}\n`;
      });
      csvContent += '\n';
      
      // Top Categories
      csvContent += 'TOP CATEGORIES\n';
      csvContent += 'Rank,Category,Items Sold,Orders,Revenue\n';
      topCategories.forEach((category, index) => {
        csvContent += `${index + 1},"${category.name}",${category.totalQuantity},${category.orderCount},${formatCurrencyPlain(category.totalRevenue)}\n`;
      });
      csvContent += '\n';
      
      // Traffic Sources
      csvContent += 'TRAFFIC SOURCES\n';
      csvContent += 'Source,Orders,AOV,Revenue\n';
      utmSourceData.forEach((data) => {
        csvContent += `"${data.source}",${data.orders},${formatCurrencyPlain(data.avgOrderValue)},${formatCurrencyPlain(data.revenue)}\n`;
      });
      csvContent += '\n';
      
      // Conversion by Source
      csvContent += 'CONVERSION BY SOURCE\n';
      csvContent += 'Source,Visitors,Orders,Conversion Rate,Revenue\n';
      conversionData.forEach((data) => {
        csvContent += `"${data.source}",${data.visitors},${data.orders},${data.conversionRate.toFixed(2)}%,${formatCurrencyPlain(data.revenue)}\n`;
      });
      csvContent += '\n';
      
      // Campaign Performance
      if (utmCampaignData.length > 0) {
        csvContent += 'CAMPAIGN PERFORMANCE\n';
        csvContent += 'Campaign,Source,Orders,Revenue,AOV\n';
        utmCampaignData.forEach((campaign) => {
          const aov = campaign.orders > 0 ? campaign.revenue / campaign.orders : 0;
          csvContent += `"${campaign.campaign}","${campaign.source}",${campaign.orders},${formatCurrencyPlain(campaign.revenue)},${formatCurrencyPlain(aov)}\n`;
        });
      }
      
      // Create and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-report_${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV report downloaded successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  }, [startDate, endDate, stats, percentageChanges, overallConversion, topProducts, topCategories, utmSourceData, conversionData, utmCampaignData]);

  // Export to PDF
  const exportToPDF = useCallback(() => {
    try {
      const dateRange = startDate && endDate 
        ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
        : 'All Time';
      
      const doc = new jsPDF();
      let yPos = 20;
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Analytics Report', 14, yPos);
      yPos += 10;
      
      // Date range
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Period: ${dateRange}`, 14, yPos);
      yPos += 6;
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 14, yPos);
      yPos += 12;
      
      // KPI Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Key Metrics', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value', 'Change']],
        body: [
          ['Total Revenue', formatCurrencyPlain(stats.totalRevenue), `${percentageChanges.revenue >= 0 ? '+' : ''}${percentageChanges.revenue.toFixed(1)}%`],
          ['Total Orders', stats.totalOrders.toString(), `${percentageChanges.orders >= 0 ? '+' : ''}${percentageChanges.orders.toFixed(1)}%`],
          ['Average Order Value', formatCurrencyPlain(stats.avgOrderValue), `${percentageChanges.avgOrder >= 0 ? '+' : ''}${percentageChanges.avgOrder.toFixed(1)}%`],
          ['Items Sold', stats.totalItems.toString(), `${percentageChanges.items >= 0 ? '+' : ''}${percentageChanges.items.toFixed(1)}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 76] },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 12;
      
      // Conversion Funnel
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Conversion Funnel', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Visitors', overallConversion.totalVisitors.toString()],
          ['Total Conversions', overallConversion.totalOrders.toString()],
          ['Conversion Rate', `${overallConversion.conversionRate.toFixed(2)}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 76] },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 12;
      
      // Top Products
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Products', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Product', 'Qty Sold', 'Revenue']],
        body: topProducts.map((p, i) => [
          (i + 1).toString(),
          p.name.substring(0, 30) + (p.name.length > 30 ? '...' : ''),
          p.totalQuantity.toString(),
          formatCurrencyPlain(p.totalRevenue),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 76] },
      });
      
      // New page for more tables
      doc.addPage();
      yPos = 20;
      
      // Traffic Sources
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Traffic Sources', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Source', 'Orders', 'AOV', 'Revenue']],
        body: utmSourceData.map((d) => [
          d.source,
          d.orders.toString(),
          formatCurrencyPlain(d.avgOrderValue),
          formatCurrencyPlain(d.revenue),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 76] },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 12;
      
      // Conversion by Source
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Conversion by Source', 14, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Source', 'Visitors', 'Orders', 'Conv. Rate', 'Revenue']],
        body: conversionData.slice(0, 10).map((d) => [
          d.source,
          d.visitors.toString(),
          d.orders.toString(),
          `${d.conversionRate.toFixed(2)}%`,
          formatCurrencyPlain(d.revenue),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 76] },
      });
      
      // Campaign Performance
      if (utmCampaignData.length > 0) {
        yPos = (doc as any).lastAutoTable.finalY + 12;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Campaign Performance', 14, yPos);
        yPos += 8;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Campaign', 'Source', 'Orders', 'Revenue']],
          body: utmCampaignData.map((c) => [
            c.campaign.substring(0, 25) + (c.campaign.length > 25 ? '...' : ''),
            c.source,
            c.orders.toString(),
            formatCurrencyPlain(c.revenue),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 76] },
        });
      }
      
      // Save
      const fileName = `analytics-report_${format(startDate || new Date(), 'yyyy-MM-dd')}_to_${format(endDate || new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  }, [startDate, endDate, stats, percentageChanges, overallConversion, topProducts, utmSourceData, conversionData, utmCampaignData]);

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

            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="comparison-toggle"
                checked={showComparison}
                onCheckedChange={setShowComparison}
              />
              <Label htmlFor="comparison-toggle" className="text-sm cursor-pointer">
                Compare
              </Label>
              
              {showComparison && (
                <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType)}>
                  <SelectTrigger className="w-[160px]">
                    <GitCompare className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Compare with" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous_period">Previous Period</SelectItem>
                    <SelectItem value="previous_month">Same Period Last Month</SelectItem>
                    <SelectItem value="previous_year">Same Period Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Custom comparison date pickers */}
          {showComparison && comparisonType === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Compare with:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !customCompareStart && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customCompareStart ? format(customCompareStart, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={customCompareStart} 
                    onSelect={setCustomCompareStart} 
                    initialFocus 
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !customCompareEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customCompareEnd ? format(customCompareEnd, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={customCompareEnd} 
                    onSelect={setCustomCompareEnd} 
                    initialFocus 
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {showComparison && previousPeriodDates.start && previousPeriodDates.end && comparisonType !== 'custom' && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Comparing: </span>
              {format(startDate!, 'MMM d')} - {format(endDate!, 'MMM d, yyyy')}
              <span className="mx-2">vs</span>
              {format(previousPeriodDates.start, 'MMM d')} - {format(previousPeriodDates.end, 'MMM d, yyyy')}
              <Badge variant="outline" className="ml-2 text-xs">
                {comparisonType === 'previous_period' && 'Previous Period'}
                {comparisonType === 'previous_month' && 'Last Month'}
                {comparisonType === 'previous_year' && 'Last Year'}
              </Badge>
            </div>
          )}

          {showComparison && comparisonType === 'custom' && customCompareStart && customCompareEnd && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Comparing: </span>
              {format(startDate!, 'MMM d')} - {format(endDate!, 'MMM d, yyyy')}
              <span className="mx-2">vs</span>
              {format(customCompareStart, 'MMM d')} - {format(customCompareEnd, 'MMM d, yyyy')}
              <Badge variant="outline" className="ml-2 text-xs">Custom Range</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                percentageChanges.revenue >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
              )}>
                {percentageChanges.revenue >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                <ChangeIndicator value={percentageChanges.revenue} />
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
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <ChangeIndicator value={percentageChanges.orders} />
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
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
                <ChangeIndicator value={percentageChanges.avgOrder} />
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
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
                <ChangeIndicator value={percentageChanges.items} />
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

      {/* UTM Source Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by UTM Source Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Revenue by Traffic Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {utmSourceChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No UTM data for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={utmSourceChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {utmSourceChartData.map((entry, index) => (
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

        {/* UTM Source Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Traffic Sources Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {utmSourceData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No UTM data available</div>
            ) : (
              <div className="space-y-3">
                {utmSourceData.map((data, index) => (
                  <div key={data.source} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="font-bold text-lg text-muted-foreground w-6">#{index + 1}</span>
                    <div 
                      className="h-10 w-10 rounded flex items-center justify-center bg-background border"
                    >
                      {getSourceIcon(data.source)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{data.source}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.orders} orders • AOV: {formatCurrency(data.avgOrderValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(data.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overall Conversion Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">{overallConversion.totalVisitors}</p>
                  <p className="text-sm text-muted-foreground">Visitors</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <MousePointerClick className="h-6 w-6 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold">{overallConversion.totalOrders}</p>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{overallConversion.conversionRate.toFixed(2)}%</p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
              
              {/* Conversion Funnel Visual */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Visitors</span>
                  <span className="text-sm text-muted-foreground">{overallConversion.totalVisitors}</span>
                </div>
                <div className="h-4 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
                
                <div className="flex items-center justify-between mb-2 mt-4">
                  <span className="text-sm font-medium">Conversions</span>
                  <span className="text-sm text-muted-foreground">{overallConversion.totalOrders}</span>
                </div>
                <div className="h-4 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all" 
                    style={{ width: `${Math.min(overallConversion.conversionRate * 10, 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              Conversion by Traffic Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conversionData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No visitor data available yet. Start driving traffic to see conversion rates.
              </div>
            ) : (
              <div className="space-y-3">
                {conversionData.slice(0, 6).map((data, index) => (
                  <div key={data.source} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="font-bold text-lg text-muted-foreground w-6">#{index + 1}</span>
                    <div className="h-10 w-10 rounded flex items-center justify-center bg-background border">
                      {getSourceIcon(data.source)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{data.source}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.visitors} visitors → {data.orders} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold",
                        data.conversionRate >= 3 && "text-green-600 dark:text-green-400",
                        data.conversionRate > 0 && data.conversionRate < 3 && "text-amber-600 dark:text-amber-400",
                        data.conversionRate === 0 && "text-muted-foreground"
                      )}>
                        {data.conversionRate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(data.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance */}
      {utmCampaignData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-3 font-medium text-muted-foreground">Campaign</th>
                    <th className="pb-3 font-medium text-muted-foreground">Source</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Orders</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Revenue</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {utmCampaignData.map((campaign) => (
                    <tr key={campaign.campaign} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{campaign.campaign}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(campaign.source)}
                          <span className="text-muted-foreground">{campaign.source}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right">{campaign.orders}</td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(campaign.revenue)}</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {formatCurrency(campaign.orders > 0 ? campaign.revenue / campaign.orders : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
