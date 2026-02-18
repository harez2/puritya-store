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

interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  product_image?: string | null;
  quantity: number;
  size?: string | null;
  color?: string | null;
  price: number;
}

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

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  sizes?: string[];
  colors?: string[];
}

interface EditOrderDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditOrderDialog({ 
  order, 
  open, 
  onOpenChange,
  onSaved
}: EditOrderDialogProps) {
  const { settings } = useSiteSettings();
  const shippingOptions = (settings.shipping_options || []).filter(opt => opt.enabled);
  const paymentMethods = (settings.payment_methods || []).filter(m => m.enabled);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Customer / Shipping info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Order items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);
  
  // Shipping fee
  const [shippingFee, setShippingFee] = useState(0);

  // Product search for adding items
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Variant selection for variable products
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    if (order && open) {
      loadOrderData();
    }
  }, [order, open]);

  const loadOrderData = async () => {
    if (!order) return;
    
    setLoading(true);
    try {
      // Load order items
      const { data: items, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;

      const mappedItems: OrderItem[] = (items || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price,
      }));

      setOrderItems(mappedItems);
      setOriginalItems(mappedItems);

      // Load shipping address
      const addr = order.shipping_address || {};
      setFullName(addr.fullName || addr.full_name || '');
      setPhone(addr.phone || '');
      setEmail(addr.email || '');
      setAddressLine1(addr.addressLine1 || addr.address_line1 || '');
      setAddressLine2(addr.addressLine2 || addr.address_line2 || '');
      setCity(addr.city || '');
      setState(addr.state || '');
      setPostalCode(addr.postalCode || addr.postal_code || '');
      setCountry(addr.country || 'Bangladesh');
      setNotes(order.notes || '');
      setPaymentMethod(order.payment_method || 'cod');
      setShippingFee(order.shipping_fee || 0);
    } catch (error) {
      console.error('Error loading order data:', error);
      toast.error('Failed to load order data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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

  const handleProductSelect = (product: Product) => {
    const hasVariants = (product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0);
    if (hasVariants) {
      setPendingProduct(product);
      setSelectedSize(product.sizes?.[0] || '');
      setSelectedColor(product.colors?.[0] || '');
    } else {
      addProductToOrder(product, null, null);
    }
    setProductSearch('');
    setSearchResults([]);
  };

  const addProductToOrder = (product: Product, size: string | null, color: string | null) => {
    const existingIndex = orderItems.findIndex(
      item => item.product_id === product.id && item.size === size && item.color === color
    );
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || null,
        quantity: 1,
        price: product.price,
        size,
        color,
      }]);
    }
    setPendingProduct(null);
    setShowProductSearch(false);
  };

  const confirmVariantAdd = () => {
    if (!pendingProduct) return;
    addProductToOrder(
      pendingProduct,
      selectedSize || null,
      selectedColor || null,
    );
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const updated = [...orderItems];
    updated[index].quantity = quantity;
    setOrderItems(updated);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!order) return;
    
    if (!fullName.trim()) {
      toast.error('Please enter the customer name');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter the customer phone number');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    setSaving(true);
    try {
      // Update shipping address
      const shippingAddress = {
        fullName: fullName.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        addressLine1: addressLine1.trim(),
        address_line1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        postal_code: postalCode.trim(),
        country: country.trim(),
      };

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          shipping_address: shippingAddress,
          notes: notes.trim() || null,
          payment_method: paymentMethod || null,
          subtotal,
          shipping_fee: shippingFee,
          total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Handle order items updates
      // Delete removed items
      const currentItemIds = orderItems.filter(item => item.id).map(item => item.id);
      const originalItemIds = originalItems.map(item => item.id);
      const deletedItemIds = originalItemIds.filter(id => id && !currentItemIds.includes(id));

      if (deletedItemIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .in('id', deletedItemIds as string[]);
        if (deleteError) throw deleteError;
      }

      // Update existing items and insert new ones
      for (const item of orderItems) {
        if (item.id) {
          // Update existing
          const { error: updateError } = await supabase
            .from('order_items')
            .update({
              product_name: item.product_name,
              product_image: item.product_image,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              price: item.price,
            })
            .eq('id', item.id);
          if (updateError) throw updateError;
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('order_items')
            .insert({
              order_id: order.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_image: item.product_image,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              price: item.price,
            });
          if (insertError) throw insertError;
        }
      }

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
            Edit Order {order.order_number}
          </DialogTitle>
          <DialogDescription>
            Update customer information, shipping details, and order items.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Customer / Shipping Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Customer & Shipping Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-order-full-name">Full Name *</Label>
                  <Input
                    id="edit-order-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-phone">Phone *</Label>
                  <Input
                    id="edit-order-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-order-email">Email</Label>
                  <Input
                    id="edit-order-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-order-address1">Address Line 1</Label>
                  <Input
                    id="edit-order-address1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-order-address2">Address Line 2</Label>
                  <Input
                    id="edit-order-address2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-city">City</Label>
                  <Input
                    id="edit-order-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-state">State / Division</Label>
                  <Input
                    id="edit-order-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State or division"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-postal">Postal Code</Label>
                  <Input
                    id="edit-order-postal"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Postal code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-country">Country</Label>
                  <Input
                    id="edit-order-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-order-payment">Payment Method</Label>
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
                  <Label htmlFor="edit-order-shipping-fee">Shipping Fee</Label>
                  <Input
                    id="edit-order-shipping-fee"
                    type="number"
                    min={0}
                    value={shippingFee}
                    onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                    placeholder="Shipping fee"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-order-notes">Order Notes</Label>
                <Textarea
                  id="edit-order-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this order"
                  rows={2}
                />
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Order Items</h3>
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
                          onClick={() => handleProductSelect(product)}
                        >
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt="" className="w-8 h-8 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(product.price)}
                              {((product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 0) && (
                                <span className="ml-1 text-primary">• Has variants</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Variant selector for variable products */}
              {pendingProduct && (
                <div className="border rounded-md p-4 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    {pendingProduct.images?.[0] && (
                      <img src={pendingProduct.images[0]} alt="" className="w-10 h-10 object-cover rounded" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{pendingProduct.name}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(pendingProduct.price)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {pendingProduct.sizes && pendingProduct.sizes.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Size</Label>
                        <Select value={selectedSize} onValueChange={setSelectedSize}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {pendingProduct.sizes.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {pendingProduct.colors && pendingProduct.colors.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <Select value={selectedColor} onValueChange={setSelectedColor}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            {pendingProduct.colors.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmVariantAdd}>
                      <Plus className="h-3 w-3 mr-1" /> Add to Order
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingProduct(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-md divide-y">
                {orderItems.length === 0 ? (
                  <div className="px-4 py-6 text-center text-muted-foreground">
                    No items in order
                  </div>
                ) : (
                  orderItems.map((item, index) => (
                    <div key={item.id || index} className="p-3 flex items-center gap-3">
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
