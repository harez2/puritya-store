import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, ShoppingBag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  images: string[];
  sizes?: string[];
  colors?: string[];
}

interface ConvertOrderDialogProps {
  order: IncompleteOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: () => void;
}

export function ConvertOrderDialog({
  order,
  open,
  onOpenChange,
  onConverted,
}: ConvertOrderDialogProps) {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  
  const shippingOptions = (settings.shipping_options || []).filter(opt => opt.enabled);
  const paymentMethods = (settings.payment_methods || []).filter(m => m.enabled);

  // Form state
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    shipping_option: '',
    payment_method: 'cod',
    notes: '',
  });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      setForm({
        full_name: order.full_name || '',
        phone: order.phone || '',
        email: order.email || '',
        address: order.address || '',
        shipping_option: order.shipping_location || shippingOptions[0]?.id || '',
        payment_method: order.payment_method || 'cod',
        notes: order.notes || '',
      });
      setCartItems([...order.cart_items]);
    }
  }, [order]);

  // Fetch products for adding items
  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, images, sizes, colors')
      .eq('in_stock', true)
      .order('name');
    setProducts(data || []);
  }

  const selectedShipping = shippingOptions.find(o => o.id === form.shipping_option);
  const shippingFee = selectedShipping?.price || 0;
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + shippingFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddProduct = (product: Product) => {
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
    setProductSearchOpen(false);
    setProductSearch('');
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...cartItems];
    updated[index].quantity = quantity;
    setCartItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemVariant = (index: number, field: 'size' | 'color', value: string) => {
    const updated = [...cartItems];
    updated[index][field] = value;
    setCartItems(updated);
  };

  const validateForm = () => {
    if (!form.full_name.trim()) {
      toast.error('Please enter customer name');
      return false;
    }
    if (!form.phone.trim()) {
      toast.error('Please enter phone number');
      return false;
    }
    if (!form.address.trim()) {
      toast.error('Please enter address');
      return false;
    }
    if (cartItems.length === 0) {
      toast.error('Please add at least one item');
      return false;
    }
    return true;
  };

  const handleConvert = async () => {
    if (!order || !validateForm()) return;

    setIsSubmitting(true);
    try {
      // Create shipping address object
      const shippingAddress = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address_line1: form.address.trim(),
        address_line2: null,
        city: selectedShipping?.name || 'Unknown',
        state: selectedShipping?.name || 'Unknown',
        postal_code: '',
        country: 'Bangladesh',
      };

      // Generate order number
      const orderNum = 'PUR-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

      // Create the order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNum,
          user_id: null,
          status: 'pending',
          subtotal,
          shipping_fee: shippingFee,
          total,
          shipping_address: shippingAddress,
          payment_method: form.payment_method,
          payment_status: 'pending',
          notes: form.notes.trim() || null,
          order_source: 'crm_converted',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image || null,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update incomplete order status
      const { error: updateError } = await supabase
        .from('incomplete_orders')
        .update({
          status: 'converted',
          converted_order_id: newOrder.id,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Record in order status history
      await supabase
        .from('order_status_history')
        .insert({
          order_id: newOrder.id,
          old_status: null,
          new_status: 'pending',
          changed_by: user?.id,
          notes: 'Converted from incomplete order by CRM',
        });

      toast.success(`Order ${newOrder.order_number} created successfully!`);
      onConverted();
    } catch (error: any) {
      console.error('Error converting order:', error);
      toast.error(error.message || 'Failed to convert order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert to Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleInputChange}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="Email address (optional)"
              />
            </div>
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                name="address"
                value={form.address}
                onChange={handleInputChange}
                placeholder="Full shipping address"
                rows={2}
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Cart Items</h3>
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <Command>
                    <CommandInput 
                      placeholder="Search products..." 
                      value={productSearch}
                      onValueChange={setProductSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup>
                        {filteredProducts.slice(0, 10).map(product => (
                          <CommandItem
                            key={product.id}
                            onSelect={() => handleAddProduct(product)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                  <ShoppingBag className="h-3 w-3" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              {cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items added. Click "Add Item" to add products.
                </p>
              ) : (
                cartItems.map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 border rounded-lg">
                    {item.product_image ? (
                      <img src={item.product_image} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 0)}
                          className="w-16 h-8"
                        />
                        <Input
                          placeholder="Size"
                          value={item.size || ''}
                          onChange={(e) => handleUpdateItemVariant(index, 'size', e.target.value)}
                          className="w-20 h-8"
                        />
                        <Input
                          placeholder="Color"
                          value={item.color || ''}
                          onChange={(e) => handleUpdateItemVariant(index, 'color', e.target.value)}
                          className="w-20 h-8"
                        />
                        <span className="text-sm font-medium ml-auto">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shipping & Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shipping Option</Label>
              <Select value={form.shipping_option} onValueChange={(v) => setForm(prev => ({ ...prev, shipping_option: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipping" />
                </SelectTrigger>
                <SelectContent>
                  {shippingOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name} - {formatCurrency(option.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm(prev => ({ ...prev, payment_method: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.id} value={method.type}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleInputChange}
              placeholder="Order notes (optional)"
              rows={2}
            />
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Convert to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
