import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isSameDay } from 'date-fns';
import { CalendarIcon, ArrowLeft, Eye, MousePointerClick, ShoppingCart, TrendingUp, ArrowUp, ArrowDown, Minus, Megaphone, Globe, Facebook, Mail, Search, Users, Smartphone, Monitor, Tablet, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/admin/StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface AnalyticsEvent {
  id: string;
  landing_page_id: string;
  event_type: string;
  session_id: string | null;
  user_id: string | null;
  device_type: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  section_id: string | null;
  product_id: string | null;
  created_at: string;
}

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  status: string;
}

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'custom';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  google: <Search className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  direct: <Globe className="h-4 w-4" />,
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  desktop: <Monitor className="h-4 w-4" />,
};

export default function AdminLandingPageAnalytics() {
  const { id } = useParams<{ id: string }>();
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  // Fetch landing page details
  const { data: landingPage, isLoading: isLoadingPage } = useQuery({
    queryKey: ['landing-page', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('id, title, slug, status')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as LandingPage;
    },
    enabled: !!id,
  });

  // Fetch analytics data
  const { data: analyticsData = [], isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['landing-page-analytics-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_page_analytics')
        .select('*')
        .eq('landing_page_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AnalyticsEvent[];
    },
    enabled: !!id,
  });

  // Update dates based on preset
  useEffect(() => {
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

  // Filter analytics by date range
  const filteredAnalytics = useMemo(() => {
    if (!startDate || !endDate) return analyticsData;
    return analyticsData.filter(event => {
      const eventDate = new Date(event.created_at);
      return isWithinInterval(eventDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      });
    });
  }, [analyticsData, startDate, endDate]);

  // Calculate main stats
  const stats = useMemo(() => {
    const views = filteredAnalytics.filter(e => e.event_type === 'view').length;
    const clicks = filteredAnalytics.filter(e => e.event_type === 'click').length;
    const checkouts = filteredAnalytics.filter(e => e.event_type === 'checkout').length;
    const purchases = filteredAnalytics.filter(e => e.event_type === 'purchase').length;
    const uniqueSessions = new Set(filteredAnalytics.map(e => e.session_id).filter(Boolean)).size;
    const conversionRate = views > 0 ? ((checkouts / views) * 100).toFixed(2) : '0.00';
    const clickRate = views > 0 ? ((clicks / views) * 100).toFixed(2) : '0.00';

    return { views, clicks, checkouts, purchases, uniqueSessions, conversionRate, clickRate };
  }, [filteredAnalytics]);

  // Daily performance data for chart
  const dailyPerformance = useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayEvents = filteredAnalytics.filter(e => 
        isSameDay(new Date(e.created_at), day)
      );
      
      return {
        date: format(day, 'MMM d'),
        fullDate: format(day, 'yyyy-MM-dd'),
        views: dayEvents.filter(e => e.event_type === 'view').length,
        clicks: dayEvents.filter(e => e.event_type === 'click').length,
        checkouts: dayEvents.filter(e => e.event_type === 'checkout').length,
      };
    });
  }, [filteredAnalytics, startDate, endDate]);

  // UTM Source breakdown
  const utmSourceBreakdown = useMemo(() => {
    const sourceMap = new Map<string, { views: number; clicks: number; checkouts: number }>();
    
    filteredAnalytics.forEach(event => {
      const source = event.utm_source || 'Direct';
      const existing = sourceMap.get(source) || { views: 0, clicks: 0, checkouts: 0 };
      
      if (event.event_type === 'view') existing.views++;
      else if (event.event_type === 'click') existing.clicks++;
      else if (event.event_type === 'checkout') existing.checkouts++;
      
      sourceMap.set(source, existing);
    });
    
    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        ...data,
        conversionRate: data.views > 0 ? ((data.checkouts / data.views) * 100).toFixed(2) : '0.00',
      }))
      .sort((a, b) => b.views - a.views);
  }, [filteredAnalytics]);

  // UTM Campaign breakdown
  const utmCampaignBreakdown = useMemo(() => {
    const campaignMap = new Map<string, { source: string; views: number; clicks: number; checkouts: number }>();
    
    filteredAnalytics.forEach(event => {
      if (!event.utm_campaign) return;
      const key = event.utm_campaign;
      const existing = campaignMap.get(key) || { source: event.utm_source || 'Direct', views: 0, clicks: 0, checkouts: 0 };
      
      if (event.event_type === 'view') existing.views++;
      else if (event.event_type === 'click') existing.clicks++;
      else if (event.event_type === 'checkout') existing.checkouts++;
      
      campaignMap.set(key, existing);
    });
    
    return Array.from(campaignMap.entries())
      .map(([campaign, data]) => ({
        campaign,
        ...data,
        conversionRate: data.views > 0 ? ((data.checkouts / data.views) * 100).toFixed(2) : '0.00',
      }))
      .sort((a, b) => b.views - a.views);
  }, [filteredAnalytics]);

  // Device type breakdown
  const deviceBreakdown = useMemo(() => {
    const deviceMap = new Map<string, number>();
    
    filteredAnalytics.filter(e => e.event_type === 'view').forEach(event => {
      const device = event.device_type || 'unknown';
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    });
    
    return Array.from(deviceMap.entries())
      .map(([device, count], index) => ({
        name: device.charAt(0).toUpperCase() + device.slice(1),
        value: count,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAnalytics]);

  // Traffic source for pie chart
  const trafficSourceData = useMemo(() => {
    return utmSourceBreakdown.slice(0, 5).map((item, index) => ({
      name: item.source,
      value: item.views,
      color: COLORS[index % COLORS.length],
    }));
  }, [utmSourceBreakdown]);

  const chartConfig = {
    views: { label: 'Views', color: 'hsl(var(--primary))' },
    clicks: { label: 'Clicks', color: 'hsl(var(--chart-2))' },
    checkouts: { label: 'Checkouts', color: 'hsl(var(--chart-3))' },
  };

  if (isLoadingPage || isLoadingAnalytics) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </AdminLayout>
    );
  }

  if (!landingPage) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Landing page not found</p>
          <Link to="/admin/landing-pages">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Landing Pages
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/landing-pages">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {landingPage.title}
                <Badge variant={landingPage.status === 'published' ? 'default' : 'secondary'}>
                  {landingPage.status}
                </Badge>
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                /lp/{landingPage.slug}
                {landingPage.status === 'published' && (
                  <a 
                    href={`/lp/${landingPage.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                )}
              </p>
            </div>
          </div>
          
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM d, yyyy') : 'Start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d, yyyy') : 'End'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Page Views"
            value={stats.views.toLocaleString()}
            icon={<Eye className="h-5 w-5" />}
          />
          <StatCard
            title="Unique Sessions"
            value={stats.uniqueSessions.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="CTA Clicks"
            value={stats.clicks.toLocaleString()}
            icon={<MousePointerClick className="h-5 w-5" />}
          />
          <StatCard
            title="Checkouts"
            value={stats.checkouts.toLocaleString()}
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <StatCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Performance Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Views, clicks, and checkouts over time</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyPerformance.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="checkouts" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available for selected period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
              <CardDescription>Views by device type</CardDescription>
            </CardHeader>
            <CardContent>
              {deviceBreakdown.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* UTM Source and Traffic Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* UTM Source Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Traffic Sources
              </CardTitle>
              <CardDescription>Performance by UTM source</CardDescription>
            </CardHeader>
            <CardContent>
              {utmSourceBreakdown.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Checkouts</TableHead>
                      <TableHead className="text-right">Conv. Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utmSourceBreakdown.map((row) => (
                      <TableRow key={row.source}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {SOURCE_ICONS[row.source.toLowerCase()] || <Globe className="h-4 w-4" />}
                            {row.source}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{row.views}</TableCell>
                        <TableCell className="text-right">{row.clicks}</TableCell>
                        <TableCell className="text-right">{row.checkouts}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(row.conversionRate) > 0 ? 'default' : 'secondary'}>
                            {row.conversionRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No traffic source data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traffic Source Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Distribution</CardTitle>
              <CardDescription>Views by source</CardDescription>
            </CardHeader>
            <CardContent>
              {trafficSourceData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficSourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {trafficSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* UTM Campaigns */}
        {utmCampaignBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Campaign Performance
              </CardTitle>
              <CardDescription>Performance by UTM campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Checkouts</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utmCampaignBreakdown.map((row) => (
                    <TableRow key={row.campaign}>
                      <TableCell className="font-medium">{row.campaign}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.source}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.views}</TableCell>
                      <TableCell className="text-right">{row.clicks}</TableCell>
                      <TableCell className="text-right">{row.checkouts}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={Number(row.conversionRate) > 0 ? 'default' : 'secondary'}>
                          {row.conversionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Visitor journey from view to checkout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-8">
              <div className="text-center flex-1">
                <div className="text-4xl font-bold text-primary">{stats.views}</div>
                <p className="text-sm text-muted-foreground mt-1">Page Views</p>
              </div>
              <ArrowDown className="h-8 w-8 text-muted-foreground rotate-[-90deg]" />
              <div className="text-center flex-1">
                <div className="text-4xl font-bold text-primary">{stats.clicks}</div>
                <p className="text-sm text-muted-foreground mt-1">CTA Clicks</p>
                <p className="text-xs text-muted-foreground">({stats.clickRate}% click rate)</p>
              </div>
              <ArrowDown className="h-8 w-8 text-muted-foreground rotate-[-90deg]" />
              <div className="text-center flex-1">
                <div className="text-4xl font-bold text-primary">{stats.checkouts}</div>
                <p className="text-sm text-muted-foreground mt-1">Checkouts</p>
                <p className="text-xs text-muted-foreground">({stats.conversionRate}% conversion)</p>
              </div>
            </div>

            {/* Visual funnel bar */}
            <div className="flex items-center gap-1 h-12 rounded-lg overflow-hidden mt-4">
              <div 
                className="bg-primary h-full transition-all" 
                style={{ width: '100%' }}
                title={`${stats.views} views`}
              />
            </div>
            <div className="flex items-center gap-1 h-12 rounded-lg overflow-hidden mt-2">
              <div 
                className="bg-primary/70 h-full transition-all" 
                style={{ width: stats.views > 0 ? `${(stats.clicks / stats.views) * 100}%` : '0%' }}
                title={`${stats.clicks} clicks`}
              />
            </div>
            <div className="flex items-center gap-1 h-12 rounded-lg overflow-hidden mt-2">
              <div 
                className="bg-primary/50 h-full transition-all" 
                style={{ width: stats.views > 0 ? `${(stats.checkouts / stats.views) * 100}%` : '0%' }}
                title={`${stats.checkouts} checkouts`}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
