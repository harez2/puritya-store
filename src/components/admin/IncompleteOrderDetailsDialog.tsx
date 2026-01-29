import { format } from 'date-fns';
import { Phone, Mail, MapPin, Clock, ShoppingBag, CreditCard, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

interface IncompleteOrderDetailsDialogProps {
  order: IncompleteOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncompleteOrderDetailsDialog({
  order,
  open,
  onOpenChange,
}: IncompleteOrderDetailsDialogProps) {
  if (!order) return null;

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
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'converted':
        return <Badge className="bg-green-100 text-green-800">Converted</Badge>;
      case 'hidden':
        return <Badge className="bg-gray-100 text-gray-800">Hidden</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Incomplete Order Details
            {getStatusBadge(order.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Timeline Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {format(new Date(order.created_at), 'MMM dd, yyyy hh:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {format(new Date(order.last_updated_at), 'MMM dd, yyyy hh:mm a')}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div>
            <h3 className="font-medium mb-3">Customer Information</h3>
            <div className="space-y-2">
              {order.full_name && (
                <p className="text-sm flex items-center gap-2">
                  <span className="font-medium">{order.full_name}</span>
                </p>
              )}
              {order.phone && (
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${order.phone}`} className="hover:text-primary">
                    {order.phone}
                  </a>
                </p>
              )}
              {order.email && (
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${order.email}`} className="hover:text-primary">
                    {order.email}
                  </a>
                </p>
              )}
              {order.address && (
                <p className="text-sm flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {order.address}
                </p>
              )}
              {order.shipping_location && (
                <p className="text-sm text-muted-foreground pl-6">
                  Shipping Zone: {order.shipping_location}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Details */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Order Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="outline">
                  {order.source === 'quick_buy' ? 'Quick Buy' : 'Checkout'}
                </Badge>
              </div>
              {order.payment_method && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span>{order.payment_method}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Cart Items */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Cart Items ({order.cart_items.length})
            </h3>
            <div className="space-y-3">
              {order.cart_items.map((item, index) => (
                <div key={index} className="flex gap-3 p-3 border rounded-lg">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      {item.size && <span>Size: {item.size}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                      <span>Qty: {item.quantity}</span>
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(order.shipping_fee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Customer Notes
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                  {order.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
