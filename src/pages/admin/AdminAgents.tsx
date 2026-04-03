import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, TrendingUp, Package, ShoppingCart, Search, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AgentProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

interface AgentStats {
  agent_id: string;
  agent_name: string;
  agent_phone: string | null;
  total_orders: number;
  total_revenue: number;
  total_items: number;
  avg_order_value: number;
}

interface AgentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  shipping_address: any;
  order_source: string | null;
  item_count: number;
}

const datePresets = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: 'All Time', days: -1 },
];

export default function AdminAgents() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('30 Days');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentOrders, setAgentOrders] = useState<AgentOrder[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all agents (users with agent role)
      const { data: agentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');

      const agentIds = (agentRoles || []).map(r => r.user_id);

      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', agentIds);
        setAgents(profiles || []);
      } else {
        setAgents([]);
      }

      // Fetch all orders with assigned_agent_id
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, order_number, total, status, created_at, shipping_address, order_source, assigned_agent_id')
        .not('assigned_agent_id', 'is', null)
        .is('deleted_at', null);

      setOrders(allOrders || []);

      // Fetch order items for these orders
      if (allOrders && allOrders.length > 0) {
        const orderIds = allOrders.map(o => o.id);
        // Batch fetch in chunks of 100
        const allItems: any[] = [];
        for (let i = 0; i < orderIds.length; i += 100) {
          const chunk = orderIds.slice(i, i + 100);
          const { data: items } = await supabase
            .from('order_items')
            .select('order_id, quantity')
            .in('order_id', chunk);
          if (items) allItems.push(...items);
        }
        setOrderItems(allItems);
      }
    } catch (err: any) {
      toast.error('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const preset = datePresets.find(p => p.label === datePreset);
    let filtered = orders;

    if (preset && preset.days >= 0) {
      const startDate = preset.days === 0 ? startOfDay(new Date()) : startOfDay(subDays(new Date(), preset.days));
      filtered = filtered.filter(o => new Date(o.created_at) >= startDate);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(o => {
        const src = (o.order_source || '').replace('__silent', '');
        return src === sourceFilter;
      });
    }

    return filtered;
  }, [orders, datePreset, sourceFilter]);

  const agentStats: AgentStats[] = useMemo(() => {
    const agentMap = new Map<string, AgentStats>();

    agents.forEach(agent => {
      agentMap.set(agent.user_id, {
        agent_id: agent.user_id,
        agent_name: agent.full_name || 'Unknown Agent',
        agent_phone: agent.phone,
        total_orders: 0,
        total_revenue: 0,
        total_items: 0,
        avg_order_value: 0,
      });
    });

    filteredOrders.forEach(order => {
      const stat = agentMap.get(order.assigned_agent_id);
      if (stat && !['cancelled', 'returned'].includes(order.status)) {
        stat.total_orders++;
        stat.total_revenue += Number(order.total) || 0;
        const items = orderItems.filter(i => i.order_id === order.id);
        stat.total_items += items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
      }
    });

    agentMap.forEach(stat => {
      stat.avg_order_value = stat.total_orders > 0 ? stat.total_revenue / stat.total_orders : 0;
    });

    let result = Array.from(agentMap.values());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.agent_name.toLowerCase().includes(q) || (a.agent_phone || '').includes(q));
    }
    return result.sort((a, b) => b.total_revenue - a.total_revenue);
  }, [agents, filteredOrders, orderItems, searchQuery]);

  const totals = useMemo(() => ({
    agents: agents.length,
    orders: agentStats.reduce((s, a) => s + a.total_orders, 0),
    revenue: agentStats.reduce((s, a) => s + a.total_revenue, 0),
    items: agentStats.reduce((s, a) => s + a.total_items, 0),
  }), [agentStats, agents]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      const src = (o.order_source || '').replace('__silent', '');
      if (src) set.add(src);
    });
    return Array.from(set).sort();
  }, [orders]);

  const viewAgentDetails = (agentId: string) => {
    setSelectedAgent(agentId);
    const agentFilteredOrders = filteredOrders
      .filter(o => o.assigned_agent_id === agentId)
      .map(o => ({
        ...o,
        item_count: orderItems.filter(i => i.order_id === o.id).reduce((s: number, i: any) => s + (i.quantity || 0), 0),
      }))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAgentOrders(agentFilteredOrders);
    setDetailsOpen(true);
  };

  const selectedAgentName = agents.find(a => a.user_id === selectedAgent)?.full_name || 'Agent';

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Agent Performance</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
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
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-[200px]"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totals.agents}</p>
                  <p className="text-xs text-muted-foreground">Total Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{totals.orders}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{totals.items}</p>
                  <p className="text-xs text-muted-foreground">Items Sold</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : agentStats.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No agents found. Assign the "agent" role to users from the User Roles page.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Items Sold</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentStats.map(agent => (
                      <TableRow key={agent.agent_id}>
                        <TableCell className="font-medium">{agent.agent_name}</TableCell>
                        <TableCell className="text-muted-foreground">{agent.agent_phone || '—'}</TableCell>
                        <TableCell className="text-right">{agent.total_orders}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(agent.total_revenue)}</TableCell>
                        <TableCell className="text-right">{agent.total_items}</TableCell>
                        <TableCell className="text-right">{formatCurrency(agent.avg_order_value)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => viewAgentDetails(agent.agent_id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Order Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAgentName} — Orders</DialogTitle>
            </DialogHeader>
            {agentOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No orders found for this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                      <TableCell>{order.shipping_address?.full_name || order.shipping_address?.fullName || '—'}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{order.item_count}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
