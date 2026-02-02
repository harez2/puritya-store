import { useEffect, useState } from 'react';
import { Search, Eye, MoreHorizontal, Clock, User, FileText, CalendarIcon, X, Download, CheckSquare, Plus, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ManualOrderDialog } from '@/components/admin/ManualOrderDialog';
import { IncompleteOrdersTab } from '@/components/admin/IncompleteOrdersTab';
import { EditOrderDialog } from '@/components/admin/EditOrderDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSendOrderSms } from '@/hooks/useSendOrderSms';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  shipping_address: any;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  size: string | null;
  color: string | null;
}

interface StatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  changed_by_name?: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

export default function AdminOrders() {
  const { user } = useAuth();
  const { sendOrderSms } = useSendOrderSms();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [statusUpdateOrderId, setStatusUpdateOrderId] = useState<string | null>(null);
  const [statusUpdateNewStatus, setStatusUpdateNewStatus] = useState<string>('');
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderItems(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
    }
  }

  async function fetchStatusHistory(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profile names for changed_by users
      const historyWithNames: StatusHistory[] = [];
      for (const item of data || []) {
        let changedByName = 'System';
        if (item.changed_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', item.changed_by)
            .maybeSingle();
          changedByName = profile?.full_name || 'Admin';
        }
        historyWithNames.push({ ...item, changed_by_name: changedByName });
      }
      
      setStatusHistory(historyWithNames);
    } catch (error) {
      console.error('Error fetching status history:', error);
    }
  }

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    await Promise.all([fetchOrderItems(order.id), fetchStatusHistory(order.id)]);
    setIsDetailsOpen(true);
  };

  const openStatusUpdateDialog = (orderId: string, newStatus: string) => {
    setStatusUpdateOrderId(orderId);
    setStatusUpdateNewStatus(newStatus);
    setStatusUpdateNotes('');
    setIsStatusUpdateOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!statusUpdateOrderId || !statusUpdateNewStatus) return;
    
    const order = orders.find(o => o.id === statusUpdateOrderId);
    const oldStatus = order?.status;
    
    try {
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: statusUpdateNewStatus })
        .eq('id', statusUpdateOrderId);

      if (updateError) throw updateError;

      // Record status change in history with notes
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: statusUpdateOrderId,
          old_status: oldStatus,
          new_status: statusUpdateNewStatus,
          changed_by: user?.id,
          notes: statusUpdateNotes.trim() || null,
        });

      if (historyError) {
        console.error('Error recording status history:', historyError);
      }

      // Send SMS for shipped/delivered status changes
      if (order && (statusUpdateNewStatus === 'shipped' || statusUpdateNewStatus === 'delivered')) {
        const shippingAddress = order.shipping_address || {};
        const customerName = shippingAddress.full_name || 'Customer';
        const phone = shippingAddress.phone || '';
        
        if (phone) {
          sendOrderSms({
            orderNumber: order.order_number,
            customerName,
            phone,
            total: order.total,
          }, statusUpdateNewStatus as 'shipped' | 'delivered').catch(err => {
            console.log('SMS sending failed (non-blocking):', err);
          });
        }
      }

      toast.success('Order status updated');
      setIsStatusUpdateOpen(false);
      fetchOrders();
      
      if (selectedOrder?.id === statusUpdateOrderId) {
        setSelectedOrder({ ...selectedOrder, status: statusUpdateNewStatus });
        fetchStatusHistory(statusUpdateOrderId);
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleQuickStatusUpdate = (orderId: string, newStatus: string) => {
    openStatusUpdateDialog(orderId, newStatus);
  };

  const handlePaymentStatusUpdate = async (orderId: string, newPaymentStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newPaymentStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Payment status updated to ${newPaymentStatus}`);
      
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o
      ));
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, payment_status: newPaymentStatus });
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast.error(error.message || 'Failed to update payment status');
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const openBulkUpdateDialog = (newStatus: string) => {
    setBulkNewStatus(newStatus);
    setBulkNotes('');
    setIsBulkUpdateOpen(true);
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkNewStatus || selectedOrderIds.size === 0) return;
    
    try {
      const orderIdsArray = Array.from(selectedOrderIds);
      
      // Update all selected orders
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: bulkNewStatus })
        .in('id', orderIdsArray);

      if (updateError) throw updateError;

      // Record status changes in history for each order
      const historyRecords = orderIdsArray.map(orderId => {
        const order = orders.find(o => o.id === orderId);
        return {
          order_id: orderId,
          old_status: order?.status || null,
          new_status: bulkNewStatus,
          changed_by: user?.id,
          notes: bulkNotes.trim() || null,
        };
      });

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert(historyRecords);

      if (historyError) {
        console.error('Error recording status history:', historyError);
      }

      toast.success(`Updated ${selectedOrderIds.size} orders to ${bulkNewStatus}`);
      setIsBulkUpdateOpen(false);
      setSelectedOrderIds(new Set());
      fetchOrders();
    } catch (error: any) {
      console.error('Error bulk updating orders:', error);
      toast.error(error.message || 'Failed to update orders');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    // Date range filtering
    const orderDate = new Date(order.created_at);
    let matchesDateRange = true;
    
    if (startDate && endDate) {
      matchesDateRange = isWithinInterval(orderDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      });
    } else if (startDate) {
      matchesDateRange = orderDate >= startOfDay(startDate);
    } else if (endDate) {
      matchesDateRange = orderDate <= endOfDay(endDate);
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = async () => {
    try {
      toast.info('Preparing export...');
      
      // Fetch all order items for filtered orders
      const orderIds = filteredOrders.map(o => o.id);
      const { data: allOrderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);
      
      if (itemsError) throw itemsError;

      // Fetch customer profiles (filter out null user_ids for guest orders)
      const userIds = [...new Set(filteredOrders.map(o => o.user_id).filter((id): id is string => id !== null))];
      let profiles: { user_id: string; full_name: string | null; phone: string | null }[] = [];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);
        
        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const itemsMap = new Map<string, typeof allOrderItems>();
      allOrderItems?.forEach(item => {
        if (!itemsMap.has(item.order_id)) {
          itemsMap.set(item.order_id, []);
        }
        itemsMap.get(item.order_id)!.push(item);
      });

      // CSV Headers
      const headers = [
        'Order Number',
        'Order Date',
        'Status',
        'Payment Status',
        'Payment Method',
        'Customer Name',
        'Customer Phone',
        'Shipping Name',
        'Shipping Phone',
        'Shipping Address',
        'City',
        'State',
        'Postal Code',
        'Country',
        'Item Name',
        'Item Size',
        'Item Color',
        'Item Quantity',
        'Item Price',
        'Subtotal',
        'Shipping Fee',
        'Total',
        'Notes'
      ];

      const rows: string[][] = [];
      
      for (const order of filteredOrders) {
        const profile = profileMap.get(order.user_id);
        const items = itemsMap.get(order.id) || [];
        const shippingAddr = order.shipping_address || {};
        
        if (items.length === 0) {
          // Order with no items
          rows.push([
            order.order_number,
            format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
            order.status,
            order.payment_status || 'pending',
            order.payment_method || '',
            profile?.full_name || '',
            profile?.phone || '',
            shippingAddr.full_name || '',
            shippingAddr.phone || '',
            [shippingAddr.address_line1, shippingAddr.address_line2].filter(Boolean).join(', '),
            shippingAddr.city || '',
            shippingAddr.state || '',
            shippingAddr.postal_code || '',
            shippingAddr.country || '',
            '',
            '',
            '',
            '',
            '',
            String(order.subtotal),
            String(order.shipping_fee),
            String(order.total),
            order.notes || ''
          ]);
        } else {
          // One row per item
          items.forEach((item, index) => {
            rows.push([
              index === 0 ? order.order_number : '',
              index === 0 ? format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
              index === 0 ? order.status : '',
              index === 0 ? (order.payment_status || 'pending') : '',
              index === 0 ? (order.payment_method || '') : '',
              index === 0 ? (profile?.full_name || '') : '',
              index === 0 ? (profile?.phone || '') : '',
              index === 0 ? (shippingAddr.full_name || '') : '',
              index === 0 ? (shippingAddr.phone || '') : '',
              index === 0 ? [shippingAddr.address_line1, shippingAddr.address_line2].filter(Boolean).join(', ') : '',
              index === 0 ? (shippingAddr.city || '') : '',
              index === 0 ? (shippingAddr.state || '') : '',
              index === 0 ? (shippingAddr.postal_code || '') : '',
              index === 0 ? (shippingAddr.country || '') : '',
              item.product_name,
              item.size || '',
              item.color || '',
              String(item.quantity),
              String(item.price),
              index === 0 ? String(order.subtotal) : '',
              index === 0 ? String(order.shipping_fee) : '',
              index === 0 ? String(order.total) : '',
              index === 0 ? (order.notes || '') : ''
            ]);
          });
        }
      }

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredOrders.length} orders`);
    } catch (error: any) {
      console.error('Error exporting orders:', error);
      toast.error('Failed to export orders');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">View and manage customer orders</p>
          </div>
          <Button onClick={() => setIsManualOrderOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Order List</TabsTrigger>
            <TabsTrigger value="incomplete">Incomplete Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleExportCSV} variant="outline" disabled={filteredOrders.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              
              {/* Date Range Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Date range:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[150px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-sm text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[150px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDateFilters}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'No orders found' : 'No orders yet'}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bulk Action Bar */}
                {selectedOrderIds.size > 0 && (
                  <div className="flex items-center gap-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {selectedOrderIds.size} order{selectedOrderIds.size > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-sm text-muted-foreground">Update to:</span>
                      <Select onValueChange={openBulkUpdateDialog}>
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedOrderIds(new Set())}
                      >
                        Clear selection
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 w-10">
                        <Checkbox 
                          checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all orders"
                        />
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Payment</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className={`border-b last:border-0 hover:bg-muted/50 ${selectedOrderIds.has(order.id) ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 px-2">
                          <Checkbox 
                            checked={selectedOrderIds.has(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                            aria-label={`Select order ${order.order_number}`}
                          />
                        </td>
                        <td className="py-3 px-2 font-medium">{order.order_number}</td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleQuickStatusUpdate(order.id, value)}
                          >
                            <SelectTrigger className={`h-8 w-[120px] text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((status) => (
                                <SelectItem 
                                  key={status.value} 
                                  value={status.value}
                                  className="capitalize"
                                >
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground capitalize">
                              {order.payment_method || 'N/A'}
                            </span>
                            <Select
                              value={order.payment_status || 'pending'}
                              onValueChange={(value) => handlePaymentStatusUpdate(order.id, value)}
                            >
                              <SelectTrigger className={`h-7 w-[100px] text-xs font-medium capitalize ${getPaymentStatusColor(order.payment_status || 'pending')}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentStatusOptions.map((status) => (
                                  <SelectItem 
                                    key={status.value} 
                                    value={status.value}
                                    className="capitalize"
                                  >
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingOrder(order);
                                setIsEditOrderOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Order
                              </DropdownMenuItem>
                              {statusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => handleQuickStatusUpdate(order.id, option.value)}
                                  disabled={order.status === option.value}
                                >
                                  Mark as {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="incomplete">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Incomplete Orders</h2>
                <p className="text-sm text-muted-foreground">Abandoned checkouts that can be converted to orders</p>
              </CardHeader>
              <CardContent>
                <IncompleteOrdersTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(value) => openStatusUpdateDialog(selectedOrder.id, value)}
                  >
                    <SelectTrigger className="w-[150px] mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="font-medium">{selectedOrder.shipping_address?.fullName}</p>
                  <p>{selectedOrder.shipping_address?.addressLine1}</p>
                  {selectedOrder.shipping_address?.addressLine2 && (
                    <p>{selectedOrder.shipping_address.addressLine2}</p>
                  )}
                  <p>
                    {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}{' '}
                    {selectedOrder.shipping_address?.postalCode}
                  </p>
                  <p>{selectedOrder.shipping_address?.phone}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-xs">
                          No img
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && ' • '}
                          {item.color && `Color: ${item.color}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.price)}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(selectedOrder.shipping_fee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Order Notes</h3>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Status History Timeline */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status History
                </h3>
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                    
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 ${
                          index === 0 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'
                        }`} />
                        
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {history.old_status ? (
                                <>
                                  <Badge variant="outline" className={`capitalize text-xs ${getStatusColor(history.old_status)}`}>
                                    {history.old_status}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                </>
                              ) : null}
                              <Badge variant="outline" className={`capitalize text-xs ${getStatusColor(history.new_status)}`}>
                                {history.new_status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(history.changed_at), 'MMM d, yyyy h:mm a')}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {history.changed_by_name}
                            </span>
                          </div>
                          {history.notes && (
                            <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded flex items-start gap-2">
                              <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{history.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog with Notes */}
      <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">New Status</Label>
              <div className="mt-1">
                <Badge variant="outline" className={`capitalize ${getStatusColor(statusUpdateNewStatus)}`}>
                  {statusUpdateNewStatus}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-notes">Notes (optional)</Label>
              <Textarea
                id="status-notes"
                placeholder="Add context for this status change..."
                value={statusUpdateNotes}
                onChange={(e) => setStatusUpdateNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This note will be visible in the order's status history.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsStatusUpdateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus}>
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={isBulkUpdateOpen} onOpenChange={setIsBulkUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">
                Updating {selectedOrderIds.size} order{selectedOrderIds.size > 1 ? 's' : ''} to:
              </Label>
              <div className="mt-1">
                <Badge variant="outline" className={`capitalize ${getStatusColor(bulkNewStatus)}`}>
                  {bulkNewStatus}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-notes">Notes (optional)</Label>
              <Textarea
                id="bulk-notes"
                placeholder="Add context for this bulk status change..."
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This note will be added to all selected orders' status history.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsBulkUpdateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkStatusUpdate}>
                Update {selectedOrderIds.size} Order{selectedOrderIds.size > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Order Dialog */}
      <ManualOrderDialog
        open={isManualOrderOpen}
        onOpenChange={setIsManualOrderOpen}
        onOrderCreated={fetchOrders}
      />

      {/* Edit Order Dialog */}
      <EditOrderDialog
        order={editingOrder}
        open={isEditOrderOpen}
        onOpenChange={setIsEditOrderOpen}
        onSaved={fetchOrders}
      />
    </AdminLayout>
  );
}
