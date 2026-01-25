import { useEffect, useState } from 'react';
import { Search, Download, RefreshCw, CalendarIcon, X, Filter, DollarSign, AlertCircle, CheckCircle, History, Clock } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { PaymentMethodIcon } from '@/components/checkout/PaymentMethodIcon';

interface PaymentOrder {
  id: string;
  order_number: string;
  total: number;
  payment_status: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
  shipping_address: any;
  user_id: string | null;
}

interface PaymentHistoryEntry {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  changed_at: string;
}

const paymentStatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const paymentMethodOptions = [
  { value: 'all', label: 'All Methods' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'bkash', label: 'bKash (Manual)' },
  { value: 'bkash_gateway', label: 'bKash (Gateway)' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'sslcommerz', label: 'SSLCommerz' },
  { value: 'uddoktapay', label: 'UddoktaPay' },
];

export default function AdminPayments() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  
  // Refund dialog state
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<PaymentOrder | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Payment history state
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<PaymentOrder | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Status update with notes
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ orderId: string; oldStatus: string | null; newStatus: string } | null>(null);
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total, payment_status, payment_method, status, created_at, shipping_address, user_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || order.payment_method === paymentMethodFilter;
    
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
    
    return matchesSearch && matchesPaymentStatus && matchesPaymentMethod && matchesDateRange;
  });

  // Calculate summary stats
  const totalRevenue = filteredOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);
  
  const pendingPayments = filteredOrders
    .filter(o => o.payment_status === 'pending' || !o.payment_status)
    .reduce((sum, o) => sum + o.total, 0);
  
  const refundedAmount = filteredOrders
    .filter(o => o.payment_status === 'refunded')
    .reduce((sum, o) => sum + o.total, 0);
  
  const failedPayments = filteredOrders
    .filter(o => o.payment_status === 'failed')
    .length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      paid: { variant: 'default', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
      failed: { variant: 'destructive', className: '' },
      refunded: { variant: 'outline', className: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100' },
    };
    
    const config = statusConfig[status || 'pending'] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {(status || 'pending').charAt(0).toUpperCase() + (status || 'pending').slice(1)}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      cod: 'Cash on Delivery',
      bkash: 'bKash (Manual)',
      bkash_gateway: 'bKash',
      nagad: 'Nagad',
      sslcommerz: 'SSLCommerz',
      uddoktapay: 'UddoktaPay',
    };
    return labels[method || ''] || method || 'Not specified';
  };

  const handleOpenRefundDialog = (order: PaymentOrder) => {
    setSelectedOrderForRefund(order);
    setRefundAmount(order.total.toString());
    setRefundReason('');
    setIsRefundDialogOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!selectedOrderForRefund) return;
    
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    
    if (amount > selectedOrderForRefund.total) {
      toast.error('Refund amount cannot exceed order total');
      return;
    }
    
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }
    
    setProcessingRefund(true);
    
    try {
      const oldStatus = selectedOrderForRefund.payment_status;

      // Update payment status to refunded
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('id', selectedOrderForRefund.id);

      if (error) throw error;

      // Log the payment status change
      await supabase.from('payment_status_history').insert({
        order_id: selectedOrderForRefund.id,
        old_status: oldStatus,
        new_status: 'refunded',
        changed_by: user?.id || null,
        notes: `Refund of ${formatCurrency(amount)}: ${refundReason}`,
      });

      toast.success(`Refund of ${formatCurrency(amount)} processed for order ${selectedOrderForRefund.order_number}`);
      
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === selectedOrderForRefund.id ? { ...o, payment_status: 'refunded' } : o
      ));
      
      setIsRefundDialogOpen(false);
      setSelectedOrderForRefund(null);
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleOpenStatusUpdateDialog = (orderId: string, oldStatus: string | null, newStatus: string) => {
    setPendingStatusUpdate({ orderId, oldStatus, newStatus });
    setStatusUpdateNotes('');
    setIsStatusUpdateDialogOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!pendingStatusUpdate) return;

    const { orderId, oldStatus, newStatus } = pendingStatusUpdate;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Log the payment status change
      await supabase.from('payment_status_history').insert({
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: user?.id || null,
        notes: statusUpdateNotes.trim() || null,
      });

      toast.success(`Payment status updated to ${newStatus}`);
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, payment_status: newStatus } : o
      ));

      setIsStatusUpdateDialogOpen(false);
      setPendingStatusUpdate(null);
      setStatusUpdateNotes('');
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast.error(error.message || 'Failed to update payment status');
    }
  };

  const handleViewPaymentHistory = async (order: PaymentOrder) => {
    setSelectedOrderForHistory(order);
    setIsHistoryDialogOpen(true);
    setLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from('payment_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
      setPaymentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPaymentStatusFilter('all');
    setPaymentMethodFilter('all');
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
  };

  const exportToCSV = () => {
    const headers = ['Order Number', 'Date', 'Payment Method', 'Payment Status', 'Order Status', 'Amount', 'Customer'];
    
    const rows = filteredOrders.map(order => [
      order.order_number,
      format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
      getPaymentMethodLabel(order.payment_method),
      order.payment_status || 'pending',
      order.status,
      order.total.toString(),
      order.shipping_address?.full_name || 'Guest',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report exported successfully');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Reports</h1>
            <p className="text-muted-foreground">Track payment status, revenue, and process refunds</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                From {filteredOrders.filter(o => o.payment_status === 'paid').length} paid orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingPayments)}</div>
              <p className="text-xs text-muted-foreground">
                {filteredOrders.filter(o => o.payment_status === 'pending' || !o.payment_status).length} orders awaiting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refunded</CardTitle>
              <RefreshCw className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(refundedAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {filteredOrders.filter(o => o.payment_status === 'refunded').length} refunded orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{failedPayments}</div>
              <p className="text-xs text-muted-foreground">
                Orders with payment failures
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <Label className="mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Order number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Payment Status</Label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Payment Method</Label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="mb-2 block">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Showing {filteredOrders.length} of {orders.length} orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Order Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                        <TableCell>{order.shipping_address?.full_name || 'Guest'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {order.payment_method && <PaymentMethodIcon type={order.payment_method} />}
                            <span className="text-sm">{getPaymentMethodLabel(order.payment_method)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <Select
                            value={order.payment_status || 'pending'}
                            onValueChange={(value) => handleOpenStatusUpdateDialog(order.id, order.payment_status, value)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue>
                                {getPaymentStatusBadge(order.payment_status)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPaymentHistory(order)}
                              title="View payment history"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            {order.payment_status === 'paid' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenRefundDialog(order)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Refund
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process a refund for order {selectedOrderForRefund?.order_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order Total</Label>
              <div className="text-lg font-semibold">
                {selectedOrderForRefund && formatCurrency(selectedOrderForRefund.total)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount (BDT)</Label>
              <Input
                id="refund-amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
                max={selectedOrderForRefund?.total}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason for Refund</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Provide a reason for this refund..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessRefund} disabled={processingRefund}>
              {processingRefund ? 'Processing...' : 'Process Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateDialogOpen} onOpenChange={setIsStatusUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Change status from "{pendingStatusUpdate?.oldStatus || 'pending'}" to "{pendingStatusUpdate?.newStatus}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status-notes">Notes (optional)</Label>
              <Textarea
                id="status-notes"
                value={statusUpdateNotes}
                onChange={(e) => setStatusUpdateNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusUpdate}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Payment History
            </DialogTitle>
            <DialogDescription>
              Status change history for order {selectedOrderForHistory?.order_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No payment status changes recorded yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {paymentHistory.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entry.old_status && (
                            <>
                              <Badge variant="outline" className="bg-muted">
                                {entry.old_status}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          {getPaymentStatusBadge(entry.new_status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.changed_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
