import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Eye, MoreHorizontal, Phone, Trash2, EyeOff, ArrowRightCircle, CalendarIcon, X, ShoppingBag, Pencil, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { IncompleteOrderDetailsDialog } from './IncompleteOrderDetailsDialog';
import { ConvertOrderDialog } from './ConvertOrderDialog';
import { EditIncompleteOrderDialog } from './EditIncompleteOrderDialog';

interface CartItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
}

interface IncompleteOrder {
  id: string;
  session_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  shipping_location: string | null;
  payment_method: string | null;
  notes: string | null;
  cart_items: CartItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  source: string;
  status: string;
  converted_order_id: string | null;
  last_updated_at: string;
  created_at: string;
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'converted', label: 'Converted' },
];

export function IncompleteOrdersTab() {
  const [orders, setOrders] = useState<IncompleteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [selectedOrder, setSelectedOrder] = useState<IncompleteOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<IncompleteOrder | null>(null);
  const [orderToHide, setOrderToHide] = useState<IncompleteOrder | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('incomplete_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse cart_items JSON
      const parsedOrders = (data || []).map(order => ({
        ...order,
        cart_items: Array.isArray(order.cart_items) ? order.cart_items : JSON.parse(order.cart_items as string || '[]'),
      }));
      
      setOrders(parsedOrders);
    } catch (error) {
      console.error('Error fetching incomplete orders:', error);
      toast.error('Failed to load incomplete orders');
    } finally {
      setLoading(false);
    }
  }

  const handleViewDetails = (order: IncompleteOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleConvert = (order: IncompleteOrder) => {
    setSelectedOrder(order);
    setIsConvertOpen(true);
  };

  const handleEdit = (order: IncompleteOrder) => {
    setSelectedOrder(order);
    setIsEditOpen(true);
  };

  const handleHide = async () => {
    if (!orderToHide) return;
    
    try {
      const { error } = await supabase
        .from('incomplete_orders')
        .update({ status: 'hidden', last_updated_at: new Date().toISOString() })
        .eq('id', orderToHide.id);

      if (error) throw error;

      toast.success('Order hidden successfully');
      setOrderToHide(null);
      fetchOrders();
    } catch (error) {
      console.error('Error hiding order:', error);
      toast.error('Failed to hide order');
    }
  };

  const handleUnhide = async (order: IncompleteOrder) => {
    try {
      const { error } = await supabase
        .from('incomplete_orders')
        .update({ status: 'pending', last_updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Order restored to pending');
      fetchOrders();
    } catch (error) {
      console.error('Error unhiding order:', error);
      toast.error('Failed to restore order');
    }
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    
    try {
      const { error } = await supabase
        .from('incomplete_orders')
        .delete()
        .eq('id', orderToDelete.id);

      if (error) throw error;

      toast.success('Order deleted successfully');
      setOrderToDelete(null);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (order.phone?.includes(searchQuery) ?? false);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
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

  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = [
      'Date',
      'Time',
      'Customer Name',
      'Phone',
      'Email',
      'Address',
      'Shipping Location',
      'Payment Method',
      'Items',
      'Item Details',
      'Subtotal',
      'Shipping Fee',
      'Total',
      'Source',
      'Status',
      'Notes',
    ];

    const csvRows = filteredOrders.map(order => {
      const itemsSummary = order.cart_items.map(item => 
        `${item.product_name} (Qty: ${item.quantity}${item.size ? `, Size: ${item.size}` : ''}${item.color ? `, Color: ${item.color}` : ''}) - ৳${item.price}`
      ).join(' | ');

      return [
        format(new Date(order.created_at), 'yyyy-MM-dd'),
        format(new Date(order.created_at), 'HH:mm:ss'),
        order.full_name || '',
        order.phone || '',
        order.email || '',
        order.address?.replace(/,/g, ';') || '',
        order.shipping_location || '',
        order.payment_method || '',
        order.cart_items.length.toString(),
        itemsSummary.replace(/,/g, ';'),
        order.subtotal.toString(),
        order.shipping_fee.toString(),
        order.total.toString(),
        order.source || '',
        order.status || '',
        order.notes?.replace(/,/g, ';').replace(/\n/g, ' ') || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incomplete-orders-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredOrders.length} orders to CSV`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'converted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Converted</Badge>;
      case 'hidden':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Hidden</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    return source === 'quick_buy' 
      ? <Badge variant="outline" className="text-xs">Quick Buy</Badge>
      : <Badge variant="outline" className="text-xs">Checkout</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>

          {(startDate || endDate) && (
            <Button variant="ghost" size="icon" onClick={clearDateFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button variant="outline" onClick={exportToCSV} disabled={filteredOrders.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredOrders.length} incomplete order{filteredOrders.length !== 1 ? 's' : ''} found
      </p>

      {/* Orders Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date/Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No incomplete orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'hh:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{order.full_name || 'N/A'}</div>
                      {order.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {order.cart_items.length > 0 && order.cart_items[0].product_image ? (
                          <img 
                            src={order.cart_items[0].product_image} 
                            alt="" 
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-sm">
                          {order.cart_items.length} item{order.cart_items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      {getSourceBadge(order.source)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
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
                          {order.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(order)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleConvert(order)}>
                                <ArrowRightCircle className="h-4 w-4 mr-2" />
                                Convert to Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setOrderToHide(order)}>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Hide
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.status === 'hidden' && (
                            <DropdownMenuItem onClick={() => handleUnhide(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Restore to Pending
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setOrderToDelete(order)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Dialog */}
      <IncompleteOrderDetailsDialog
        order={selectedOrder}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {/* Convert Dialog */}
      <ConvertOrderDialog
        order={selectedOrder}
        open={isConvertOpen}
        onOpenChange={setIsConvertOpen}
        onConverted={() => {
          fetchOrders();
          setIsConvertOpen(false);
        }}
      />

      {/* Edit Dialog */}
      <EditIncompleteOrderDialog
        order={selectedOrder}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSaved={fetchOrders}
      />

      {/* Hide Confirmation */}
      <AlertDialog open={!!orderToHide} onOpenChange={() => setOrderToHide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide incomplete order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the order from the pending list. You can restore it later from the "Hidden" filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHide}>Hide</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete incomplete order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The order data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
