import { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { toast } from 'sonner';

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

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  sizes?: string[];
  colors?: string[];
}

interface EditIncompleteOrderDialogProps {
  order: IncompleteOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditIncompleteOrderDialog({ 
  order, 
  open, 
  onOpenChange,
  onSaved
}: EditIncompleteOrderDialogProps) {
  const { settings } = useSiteSettings();
  const shippingOptions = (settings.shipping_options || []).filter(opt => opt.enabled);
  const paymentMethods = (settings.payment_methods || []).filter(m => m.enabled);

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [shippingLocation, setShippingLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Product search for adding items
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);

  useEffect(() => {
    if (order && open) {
      setFullName(order.full_name || '');
      setPhone(order.phone || '');
      setEmail(order.email || '');
      setAddress(order.address || '');
      setNotes(order.notes || '');
      setShippingLocation(order.shipping_location || shippingOptions[0]?.name || '');
      setPaymentMethod(order.payment_method || 'cod');
      setCartItems([...order.cart_items]);
    }
  }, [order, open]);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const selectedShippingOption = shippingOptions.find(opt => opt.name === shippingLocation);
  const shippingFee = selectedShippingOption?.price || 0;
  const total = subtotal + shippingFee;

  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, images, sizes, colors')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const addProduct = (product: Product) => {
    const existingIndex = cartItems.findIndex(item => item.product_id === product.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0],
        quantity: 1,
        price: product.price,
      }]);
    }
    setProductSearch('');
    setSearchResults([]);
    setShowProductSearch(false);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const updated = [...cartItems];
    updated[index].quantity = quantity;
    setCartItems(updated);
  };

  const removeItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!order) return;
    
    if (!fullName.trim() && !phone.trim()) {
      toast.error('Please enter at least a name or phone number');
      return;
    }

    setSaving(true);
    try {
      // Convert cartItems to JSON-compatible format
      const cartItemsJson = cartItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image || null,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
        price: item.price,
      }));

      const { error } = await supabase
        .from('incomplete_orders')
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          shipping_location: shippingLocation || null,
          payment_method: paymentMethod || null,
          cart_items: cartItemsJson as unknown as import('@/integrations/supabase/types').Json,
          subtotal,
          shipping_fee: shippingFee,
          total,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Order updated successfully');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Incomplete Order
          </DialogTitle>
          <DialogDescription>
            Update customer information and cart items for this incomplete order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-full-name">Full Name</Label>
                <Input
                  id="edit-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shipping">Shipping Location</Label>
                <Select value={shippingLocation} onValueChange={setShippingLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.name}>
                        {opt.name} - {formatCurrency(opt.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full delivery address"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-payment">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.type}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order notes"
                />
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Cart Items</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProductSearch(!showProductSearch)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </div>

            {showProductSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map(product => (
                      <button
                        key={product.id}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                        onClick={() => addProduct(product)}
                      >
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt="" className="w-8 h-8 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(product.price)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border rounded-md divide-y">
              {cartItems.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground">
                  No items in cart
                </div>
              ) : (
                cartItems.map((item, index) => (
                  <div key={index} className="p-3 flex items-center gap-3">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} each
                        {item.size && ` • Size: ${item.size}`}
                        {item.color && ` • Color: ${item.color}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-center"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{formatCurrency(shippingFee)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
