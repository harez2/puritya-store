import { useEffect, useState } from 'react';
import { Search, Eye, MoreHorizontal, Clock, User, FileText, CalendarIcon, X, Download, CheckSquare, Plus, Pencil, Trash2, RotateCcw, AlertTriangle, Truck, RefreshCw, ExternalLink, ShoppingCart, Package, CreditCard, TrendingUp, MessageSquarePlus, Star, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ManualOrderDialog } from '@/components/admin/ManualOrderDialog';
import { IncompleteOrdersTab } from '@/components/admin/IncompleteOrdersTab';
import { EditOrderDialog } from '@/components/admin/EditOrderDialog';
import { StatusUpdateDialog } from '@/components/admin/StatusUpdateDialog';
import { OrderNotesInput } from '@/components/admin/OrderNotesInput';
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
  DropdownMenuSeparator,
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
import { format, startOfDay, endOfDay, isWithinInterval, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSendOrderSms } from '@/hooks/useSendOrderSms';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { generateInvoice, InvoiceConfig, defaultInvoiceConfig } from '@/components/admin/OrderInvoice';
import { StatCard } from '@/components/admin/StatCard';

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
  deleted_at?: string | null;
  courier_name?: string | null;
  courier_consignment_id?: string | null;
  courier_tracking_code?: string | null;
  courier_tracking_url?: string | null;
  courier_status?: string | null;
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
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'returned', label: 'Returned' },
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
  const navigate = useNavigate();
  const { sendOrderSms } = useSendOrderSms();
  const { settings } = useSiteSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [trashedOrders, setTrashedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [statusUpdateOrderId, setStatusUpdateOrderId] = useState<string | null>(null);
  const [statusUpdateNewStatus, setStatusUpdateNewStatus] = useState<string>('');
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEmptyTrashOpen, setIsEmptyTrashOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
  const [courierLoading, setCourierLoading] = useState<Set<string>>(new Set());
  const [customerOrderCounts, setCustomerOrderCounts] = useState<Map<string, number>>(new Map());
  const [orderNotes, setOrderNotes] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchTrashedOrders();
    fetchCustomerOrderCounts();
  }, []);

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrashedOrders() {
    try {
      setTrashLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setTrashedOrders((data as Order[]) || []);
    } catch (error) {
      console.error('Error fetching trashed orders:', error);
    } finally {
      setTrashLoading(false);
    }
  }

  async function fetchCustomerOrderCounts() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('shipping_address')
        .is('deleted_at', null);
      if (error) throw error;
      const counts = new Map<string, number>();
      (data || []).forEach((o: any) => {
        const phone = o.shipping_address?.phone;
        if (phone) counts.set(phone, (counts.get(phone) || 0) + 1);
      });
      setCustomerOrderCounts(counts);
    } catch (err) {
      console.error('Error fetching customer order counts:', err);
    }
  }

  async function fetchOrderNotes(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('order_notes')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const notesWithNames: any[] = [];
      for (const note of data || []) {
        let createdByName = 'Admin';
        if (note.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', note.created_by)
            .maybeSingle();
          createdByName = profile?.full_name || 'Admin';
        }
        notesWithNames.push({ ...note, created_by_name: createdByName });
      }
      setOrderNotes(notesWithNames);
    } catch (err) {
      console.error('Error fetching order notes:', err);
    }
  }

  async function handleAddNote() {
    if (!selectedOrder || !newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const { error } = await supabase
        .from('order_notes')
        .insert({
          order_id: selectedOrder.id,
          note: newNoteText.trim(),
          created_by: user?.id,
        });
      if (error) throw error;
      toast.success('Note added');
      setNewNoteText('');
      fetchOrderNotes(selectedOrder.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  }

  const handleSendToCourier = async (orderId: string) => {
    setCourierLoading(prev => new Set(prev).add(orderId));
    try {
      const { data, error } = await supabase.functions.invoke('steadfast-courier', {
        body: { action: 'create_order', order_id: orderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Sent to Steadfast! Tracking: ${data.tracking_code}`);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send to courier');
    } finally {
      setCourierLoading(prev => {
        const s = new Set(prev);
        s.delete(orderId);
        return s;
      });
    }
  };

  const handleBulkSendToCourier = async () => {
    const eligibleIds = Array.from(selectedOrderIds).filter(id => {
      const order = orders.find(o => o.id === id);
      return order && !order.courier_consignment_id;
    });
    if (eligibleIds.length === 0) {
      toast.error('No eligible orders to send');
      return;
    }
    for (const id of eligibleIds) {
      setCourierLoading(prev => new Set(prev).add(id));
    }
    try {
      const { data, error } = await supabase.functions.invoke('steadfast-courier', {
        body: { action: 'bulk_create', order_ids: eligibleIds },
      });
      if (error) throw error;
      const results = data?.results || [];
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.filter((r: any) => !r.success).length;
      if (successCount > 0) toast.success(`${successCount} order(s) sent to courier`);
      if (failCount > 0) toast.error(`${failCount} order(s) failed`);
      fetchOrders();
      setSelectedOrderIds(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Failed to send to courier');
    } finally {
      setCourierLoading(new Set());
    }
  };

  const handleSyncCourierStatus = async (orderId: string) => {
    setCourierLoading(prev => new Set(prev).add(orderId));
    try {
      const { data, error } = await supabase.functions.invoke('steadfast-courier', {
        body: { action: 'check_status', order_id: orderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Courier status: ${data.courier_status}`);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync courier status');
    } finally {
      setCourierLoading(prev => {
        const s = new Set(prev);
        s.delete(orderId);
        return s;
      });
    }
  };

  async function handleMoveToTrash(orderId: string) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order moved to trash');
      fetchOrders();
      fetchTrashedOrders();
    } catch (error: any) {
      console.error('Error moving order to trash:', error);
      toast.error(error.message || 'Failed to move order to trash');
    }
  }

  async function handleBulkMoveToTrash() {
    if (selectedOrderIds.size === 0) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: new Date().toISOString() } as any)
        .in('id', Array.from(selectedOrderIds));

      if (error) throw error;
      toast.success(`${selectedOrderIds.size} order(s) moved to trash`);
      setSelectedOrderIds(new Set());
      fetchOrders();
      fetchTrashedOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to move orders to trash');
    }
  }

  async function handleRestoreOrder(orderId: string) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: null } as any)
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order restored');
      fetchOrders();
      fetchTrashedOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore order');
    }
  }

  async function handlePermanentDelete(orderId: string) {
    try {
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      if (itemsError) throw itemsError;

      const { error: historyError } = await supabase
        .from('order_status_history')
        .delete()
        .eq('order_id', orderId);
      if (historyError) console.error('Error deleting status history:', historyError);

      const { error: payHistoryError } = await supabase
        .from('payment_status_history')
        .delete()
        .eq('order_id', orderId);
      if (payHistoryError) console.error('Error deleting payment history:', payHistoryError);

      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order permanently deleted');
      fetchTrashedOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete order');
    }
  }

  async function handleEmptyTrash() {
    try {
      for (const order of trashedOrders) {
        await handlePermanentDelete(order.id);
      }
      toast.success('Trash emptied');
      setIsEmptyTrashOpen(false);
      fetchTrashedOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to empty trash');
    }
  }

  async function handleBulkRestoreTrash() {
    if (selectedTrashIds.size === 0) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: null } as any)
        .in('id', Array.from(selectedTrashIds));
      if (error) throw error;
      toast.success(`${selectedTrashIds.size} order(s) restored`);
      setSelectedTrashIds(new Set());
      fetchOrders();
      fetchTrashedOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore orders');
    }
  }

  async function handleBulkPermanentDelete() {
    if (selectedTrashIds.size === 0) return;
    try {
      for (const id of selectedTrashIds) {
        await handlePermanentDelete(id);
      }
      toast.success(`${selectedTrashIds.size} order(s) permanently deleted`);
      setSelectedTrashIds(new Set());
      fetchTrashedOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete orders');
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
    setNewNoteText('');
    await Promise.all([fetchOrderItems(order.id), fetchStatusHistory(order.id), fetchOrderNotes(order.id)]);
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
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: statusUpdateNewStatus })
        .eq('id', statusUpdateOrderId);

      if (updateError) throw updateError;

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
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: bulkNewStatus })
        .in('id', orderIdsArray);

      if (updateError) throw updateError;

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
    const shipping = order.shipping_address || {};
    const customerName = shipping.full_name || '';
    const phone = shipping.phone || '';
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.toLowerCase().includes(searchQuery.toLowerCase());
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
      
      const orderIds = filteredOrders.map(o => o.id);
      const { data: allOrderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);
      
      if (itemsError) throw itemsError;

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

      const headers = [
        'Order Number', 'Order Date', 'Status', 'Payment Status', 'Payment Method',
        'Customer Name', 'Customer Phone', 'Shipping Name', 'Shipping Phone',
        'Shipping Address', 'City', 'State', 'Postal Code', 'Country',
        'Item Name', 'Item Size', 'Item Color', 'Item Quantity', 'Item Price',
        'Subtotal', 'Shipping Fee', 'Total', 'Notes',
        'Courier', 'Tracking Code', 'Tracking URL', 'Courier Status'
      ];

      const rows: string[][] = [];
      
      for (const order of filteredOrders) {
        const profile = order.user_id ? profileMap.get(order.user_id) : null;
        const items = itemsMap.get(order.id) || [];
        const shippingAddr = order.shipping_address || {};
        
        const customerName = profile?.full_name || shippingAddr.full_name || '';
        const customerPhone = profile?.phone || shippingAddr.phone || '';
        
        if (items.length === 0) {
          rows.push([
            order.order_number, format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
            order.status, order.payment_status || 'pending', order.payment_method || '',
            customerName, customerPhone, shippingAddr.full_name || '', shippingAddr.phone || '',
            [shippingAddr.address_line1, shippingAddr.address_line2].filter(Boolean).join(', '),
            shippingAddr.city || '', shippingAddr.state || '',
            shippingAddr.postal_code || '', shippingAddr.country || '',
            '', '', '', '', '',
            String(order.subtotal), String(order.shipping_fee), String(order.total), order.notes || '',
            order.courier_name || '', order.courier_tracking_code || '', order.courier_tracking_url || '', order.courier_status || ''
          ]);
        } else {
          items.forEach((item, index) => {
            rows.push([
              index === 0 ? order.order_number : '',
              index === 0 ? format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
              index === 0 ? order.status : '',
              index === 0 ? (order.payment_status || 'pending') : '',
              index === 0 ? (order.payment_method || '') : '',
              index === 0 ? customerName : '',
              index === 0 ? customerPhone : '',
              index === 0 ? (shippingAddr.full_name || '') : '',
              index === 0 ? (shippingAddr.phone || '') : '',
              index === 0 ? [shippingAddr.address_line1, shippingAddr.address_line2].filter(Boolean).join(', ') : '',
              index === 0 ? (shippingAddr.city || '') : '',
              index === 0 ? (shippingAddr.state || '') : '',
              index === 0 ? (shippingAddr.postal_code || '') : '',
              index === 0 ? (shippingAddr.country || '') : '',
              item.product_name, item.size || '', item.color || '',
              String(item.quantity), String(item.price),
              index === 0 ? String(order.subtotal) : '',
              index === 0 ? String(order.shipping_fee) : '',
              index === 0 ? String(order.total) : '',
              index === 0 ? (order.notes || '') : '',
              index === 0 ? (order.courier_name || '') : '',
              index === 0 ? (order.courier_tracking_code || '') : '',
              index === 0 ? (order.courier_tracking_url || '') : '',
              index === 0 ? (order.courier_status || '') : ''
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
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'confirmed': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'returned': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCourierStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'partial_delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_review':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
      case 'hold':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
            <p className="text-sm text-muted-foreground">View and manage customer orders</p>
          </div>
          <Button onClick={() => navigate('/admin/pos')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>

        <div className="grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-5 lg:grid-cols-9">
          {/* Total Orders */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.length}</p>
            </CardContent>
          </Card>
          
          {/* Pending */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.filter(o => o.status === 'pending').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatCurrency(filteredOrders.filter(o => o.status === 'pending').reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
            </CardContent>
          </Card>
          
          {/* Confirmed */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Confirmed</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.filter(o => o.status === 'confirmed').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatCurrency(filteredOrders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
            </CardContent>
          </Card>
          
          {/* Processing */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Processing</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.filter(o => o.status === 'processing').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatCurrency(filteredOrders.filter(o => o.status === 'processing').reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
            </CardContent>
          </Card>
          
          {/* Shipped */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Shipped</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.filter(o => o.status === 'shipped').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatCurrency(filteredOrders.filter(o => o.status === 'shipped').reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
            </CardContent>
          </Card>
          
          {/* Delivered */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Delivered</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.filter(o => o.status === 'delivered').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatCurrency(filteredOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
            </CardContent>
          </Card>
          
          {/* Returned */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Returned</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.filter(o => o.status === 'returned').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatCurrency(filteredOrders.filter(o => o.status === 'returned').reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
            </CardContent>
          </Card>
          
          {/* Cancelled */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Cancelled</p>
              <p className="text-lg sm:text-xl font-bold">{filteredOrders.filter(o => o.status === 'cancelled').length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatCurrency(filteredOrders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
            </CardContent>
          </Card>
          
          {/* Total Revenue */}
          <Card>
            <CardContent className="p-2 sm:p-3">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
              <p className="text-base sm:text-lg font-bold truncate">
                {formatCurrency(filteredOrders.filter(o => !['cancelled', 'returned'].includes(o.status)).reduce((sum, o) => sum + Number(o.total), 0))}
              </p>
              <p className="text-[10px] text-muted-foreground">Excl. cancelled/returned</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="w-full sm:w-auto flex">
            <TabsTrigger value="orders" className="flex-1 sm:flex-none">Order List</TabsTrigger>
            <TabsTrigger value="incomplete" className="flex-1 sm:flex-none">Incomplete</TabsTrigger>
            <TabsTrigger value="trash" className="flex-1 sm:flex-none flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Trash
              {trashedOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                  {trashedOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number, name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                  <Button onClick={handleExportCSV} variant="outline" disabled={filteredOrders.length === 0} className="w-full sm:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {selectedOrderIds.size} order{selectedOrderIds.size > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
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
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const ids = Array.from(selectedOrderIds);
                          toast.info(`Generating ${ids.length} invoice(s)...`);
                          try {
                            const [{ data: allItems, error: itemsErr }, { data: invoiceCfg }] = await Promise.all([
                              supabase.from('order_items').select('*').in('order_id', ids),
                              supabase.from('site_settings').select('value').eq('key', 'invoice_settings').maybeSingle(),
                            ]);
                            if (itemsErr) throw itemsErr;
                            const cfg = invoiceCfg?.value ? { ...defaultInvoiceConfig, ...(invoiceCfg.value as unknown as InvoiceConfig) } : defaultInvoiceConfig;
                            const storeInfo = {
                              store_name: settings.store_name,
                              store_tagline: settings.store_tagline,
                              logo_url: settings.logo_url,
                              currency_symbol: 'BDT ',
                            };
                            for (const id of ids) {
                              const order = orders.find(o => o.id === id);
                              if (!order) continue;
                              const items = (allItems || []).filter((i: any) => i.order_id === id);
                              await generateInvoice(order, items, storeInfo, cfg);
                            }
                            toast.success(`${ids.length} invoice(s) downloaded`);
                          } catch (err: any) {
                            toast.error('Failed to generate invoices');
                          }
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Download Invoices
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkSendToCourier}
                      >
                        <Truck className="h-3.5 w-3.5 mr-1" />
                        Send to Courier
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleBulkMoveToTrash}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Move to Trash
                      </Button>
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
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Date & Time</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Payment</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden xl:table-cell">Courier</th>
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
                        <td className="py-3 px-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium">{order.shipping_address?.full_name || '—'}</span>
                              {(() => {
                                const phone = order.shipping_address?.phone;
                                const count = phone ? (customerOrderCounts.get(phone) || 0) : 0;
                                return count > 1 ? (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                                    <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500 text-amber-500" />
                                    {count}
                                  </Badge>
                                ) : null;
                              })()}
                            </div>
                            {(order.shipping_address?.phone) && (
                              <span className="text-xs text-muted-foreground">{order.shipping_address.phone}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="text-sm">{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                            <span className="text-xs">{format(new Date(order.created_at), 'hh:mm a')}</span>
                          </div>
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
                        <td className="py-3 px-2 hidden lg:table-cell">
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
                        <td className="py-3 px-2 hidden xl:table-cell">
                          {order.courier_tracking_code ? (
                            <div className="flex flex-col gap-1">
                              <a
                                href={order.courier_tracking_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {order.courier_tracking_code}
                              </a>
                              {order.courier_status && (
                                <Badge variant="outline" className={`text-[10px] capitalize w-fit ${getCourierStatusColor(order.courier_status)}`}>
                                  {order.courier_status.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(order)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
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
                              <DropdownMenuItem onClick={async () => {
                                try {
                                  const [{ data: items, error }, { data: invoiceCfg }] = await Promise.all([
                                    supabase.from('order_items').select('*').eq('order_id', order.id),
                                    supabase.from('site_settings').select('value').eq('key', 'invoice_settings').maybeSingle(),
                                  ]);
                                  if (error) throw error;
                                  const cfg = invoiceCfg?.value ? { ...defaultInvoiceConfig, ...(invoiceCfg.value as unknown as InvoiceConfig) } : defaultInvoiceConfig;
                                  await generateInvoice(order, items || [], {
                                    store_name: settings.store_name,
                                    store_tagline: settings.store_tagline,
                                    logo_url: settings.logo_url,
                                    currency_symbol: 'BDT ',
                                  }, cfg);
                                } catch (err: any) {
                                  toast.error('Failed to generate invoice');
                                }
                              }}>
                                <FileText className="h-4 w-4 mr-2" />
                                View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!order.courier_consignment_id ? (
                                <DropdownMenuItem 
                                  onClick={() => handleSendToCourier(order.id)}
                                  disabled={courierLoading.has(order.id)}
                                >
                                  <Truck className="h-4 w-4 mr-2" />
                                  {courierLoading.has(order.id) ? 'Sending...' : 'Send to Courier'}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleSyncCourierStatus(order.id)}
                                  disabled={courierLoading.has(order.id)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {courierLoading.has(order.id) ? 'Syncing...' : 'Sync Courier Status'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {statusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => handleQuickStatusUpdate(order.id, option.value)}
                                  disabled={order.status === option.value}
                                >
                                  Mark as {option.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleMoveToTrash(order.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Move to Trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
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

          {/* Trash Tab */}
          <TabsContent value="trash">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Trash
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Deleted orders are kept for 30 days before being permanently removed
                    </p>
                  </div>
                  {trashedOrders.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setIsEmptyTrashOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Empty Trash
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {trashLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : trashedOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Trash is empty</p>
                    <p className="text-sm">Deleted orders will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTrashIds.size > 0 && (
                      <div className="flex items-center gap-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-sm">
                            {selectedTrashIds.size} order{selectedTrashIds.size > 1 ? 's' : ''} selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button size="sm" variant="outline" onClick={handleBulkRestoreTrash}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Restore
                          </Button>
                          <Button size="sm" variant="destructive" onClick={handleBulkPermanentDelete}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete Permanently
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTrashIds(new Set())}>
                            Clear
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
                                checked={trashedOrders.length > 0 && selectedTrashIds.size === trashedOrders.length}
                                onCheckedChange={() => {
                                  if (selectedTrashIds.size === trashedOrders.length) {
                                    setSelectedTrashIds(new Set());
                                  } else {
                                    setSelectedTrashIds(new Set(trashedOrders.map(o => o.id)));
                                  }
                                }}
                              />
                            </th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Deleted</th>
                            <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                            <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                            <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trashedOrders.map((order) => (
                            <tr key={order.id} className={`border-b last:border-0 hover:bg-muted/50 ${selectedTrashIds.has(order.id) ? 'bg-destructive/5' : ''}`}>
                              <td className="py-3 px-2">
                                <Checkbox
                                  checked={selectedTrashIds.has(order.id)}
                                  onCheckedChange={() => {
                                    setSelectedTrashIds(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(order.id)) newSet.delete(order.id);
                                      else newSet.add(order.id);
                                      return newSet;
                                    });
                                  }}
                                />
                              </td>
                              <td className="py-3 px-2">
                                <p className="font-medium">{order.order_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                                </p>
                              </td>
                              <td className="py-3 px-2 text-sm text-muted-foreground">
                                {order.deleted_at && formatDistanceToNow(new Date(order.deleted_at), { addSuffix: true })}
                              </td>
                              <td className="py-3 px-2">
                                <Badge variant="outline" className={`capitalize text-xs ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-right font-medium">
                                {formatCurrency(order.total)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestoreOrder(order.id)}
                                    title="Restore"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setOrderToDelete(order.id);
                                      setIsDeleteConfirmOpen(true);
                                    }}
                                    title="Delete permanently"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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

              {/* Courier Section */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Courier Information
                </h3>
                {selectedOrder.courier_consignment_id ? (
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Courier</span>
                      <span className="font-medium capitalize">{selectedOrder.courier_name || 'Steadfast'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consignment ID</span>
                      <span className="font-medium">{selectedOrder.courier_consignment_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tracking Code</span>
                      <a
                        href={selectedOrder.courier_tracking_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        {selectedOrder.courier_tracking_code}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {selectedOrder.courier_status && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Courier Status</span>
                        <Badge variant="outline" className={`capitalize ${getCourierStatusColor(selectedOrder.courier_status)}`}>
                          {selectedOrder.courier_status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleSyncCourierStatus(selectedOrder.id)}
                      disabled={courierLoading.has(selectedOrder.id)}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${courierLoading.has(selectedOrder.id) ? 'animate-spin' : ''}`} />
                      Sync Courier Status
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Not yet sent to courier</p>
                    <Button
                      size="sm"
                      onClick={() => handleSendToCourier(selectedOrder.id)}
                      disabled={courierLoading.has(selectedOrder.id)}
                    >
                      <Truck className="h-3.5 w-3.5 mr-1" />
                      {courierLoading.has(selectedOrder.id) ? 'Sending...' : 'Send to Courier'}
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="font-medium">{selectedOrder.shipping_address?.full_name || selectedOrder.shipping_address?.fullName}</p>
                  <p>{selectedOrder.shipping_address?.address_line1 || selectedOrder.shipping_address?.addressLine1}</p>
                  {(selectedOrder.shipping_address?.address_line2 || selectedOrder.shipping_address?.addressLine2) && (
                    <p>{selectedOrder.shipping_address.address_line2 || selectedOrder.shipping_address.addressLine2}</p>
                  )}
                  <p>
                    {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}{' '}
                    {selectedOrder.shipping_address?.postal_code || selectedOrder.shipping_address?.postalCode}
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
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                    
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="relative">
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

              {/* Admin Notes */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4" />
                  Admin Notes
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add an internal note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={addingNote || !newNoteText.trim()}
                      className="self-end"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {orderNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No internal notes yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {orderNotes.map((note: any) => (
                        <div key={note.id} className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm">{note.note}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {note.created_by_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

      {/* Empty Trash Confirmation */}
      <AlertDialog open={isEmptyTrashOpen} onOpenChange={setIsEmptyTrashOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Empty Trash
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {trashedOrders.length} order(s) in the trash. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Permanently Delete Order
            </AlertDialogTitle>
            <AlertDialogDescription>
              This order will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (orderToDelete) handlePermanentDelete(orderToDelete);
                setIsDeleteConfirmOpen(false);
                setOrderToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
