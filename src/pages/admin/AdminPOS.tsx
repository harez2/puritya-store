import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, X, Search, ShoppingCart, RotateCcw } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { generateOrderNumber, getOrderPrefix } from '@/lib/order-number';

interface Product {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  sizes: string[] | null;
  colors: string[] | null;
  in_stock: boolean;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface OrderItem {
  product: Product;
  quantity: number;
  size: string | null;
  color: string | null;
}

export default function AdminPOS() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const searchRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Bangladesh');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [shippingFee, setShippingFee] = useState(0);
  const [customerOpen, setCustomerOpen] = useState(true);

  // Variant selector state
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variantSize, setVariantSize] = useState<string | null>(null);
  const [variantColor, setVariantColor] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    searchRef.current?.focus();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, price, compare_at_price, images, sizes, colors, in_stock, category_id')
          .eq('in_stock', true)
          .order('name'),
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addProduct = (product: Product) => {
    const hasVariants =
      (product.sizes && product.sizes.length > 0) ||
      (product.colors && product.colors.length > 0);

    if (hasVariants) {
      setVariantProduct(product);
      setVariantSize(product.sizes?.[0] || null);
      setVariantColor(product.colors?.[0] || null);
      return;
    }

    addToCart(product, null, null);
  };

  const confirmVariant = () => {
    if (!variantProduct) return;
    addToCart(variantProduct, variantSize, variantColor);
    setVariantProduct(null);
  };

  const addToCart = (product: Product, size: string | null, color: string | null) => {
    const existing = orderItems.find(
      (item) =>
        item.product.id === product.id && item.size === size && item.color === color
    );
    if (existing) {
      setOrderItems((items) =>
        items.map((item) =>
          item.product.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems([...orderItems, { product, quantity: 1, size, color }]);
    }
  };

  const updateItemQuantity = (index: number, delta: number) => {
    setOrderItems((items) =>
      items
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (index: number) => {
    setOrderItems((items) => items.filter((_, i) => i !== index));
  };

  const getDisplayPrice = (product: Product) => {
    const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > 0 && Number(product.compare_at_price) < Number(product.price);
    return hasDiscount ? Number(product.compare_at_price) : Number(product.price);
  };

  const subtotal = orderItems.reduce(
    (sum, item) => sum + getDisplayPrice(item.product) * item.quantity,
    0
  );
  const total = subtotal + shippingFee;

  const resetForm = () => {
    setOrderItems([]);
    setFullName('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('Bangladesh');
    setNotes('');
    setPaymentMethod('cod');
    setPaymentStatus('pending');
    setShippingFee(0);
    setSearchQuery('');
    setSelectedCategory('all');
    searchRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    if (!fullName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter phone number');
      return;
    }
    if (!addressLine1.trim()) {
      toast.error('Please enter address');
      return;
    }
    if (!city.trim()) {
      toast.error('Please enter city');
      return;
    }

    setSubmitting(true);
    try {
      const orderPrefix = getOrderPrefix(settings.order_number_use_domain, settings.order_number_prefix);
      const orderNumber = generateOrderNumber(orderPrefix);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: null,
          subtotal,
          shipping_fee: shippingFee,
          total,
          status: 'pending',
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          order_source: 'admin_manual',
          notes: notes.trim() || null,
          shipping_address: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            address_line1: addressLine1.trim(),
            address_line2: addressLine2.trim() || null,
            city: city.trim(),
            state: state.trim(),
            postal_code: postalCode.trim(),
            country,
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsData = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_image: item.product.images?.[0] || null,
        quantity: item.quantity,
        price: getDisplayPrice(item.product),
        size: item.size,
        color: item.color,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        old_status: null,
        new_status: 'pending',
        changed_by: user?.id,
        notes: 'Order created manually by admin (POS)',
      });

      toast.success(`Order ${orderNumber} created successfully!`, {
        action: {
          label: 'New Order',
          onClick: resetForm,
        },
      });
      resetForm();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
        {/* Left Panel - Product Browser */}
        <div className="lg:w-[60%] flex flex-col gap-4 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Tabs */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="whitespace-nowrap"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Product Grid */}
          <ScrollArea className="flex-1 min-h-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No products found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-3">
                {filteredProducts.map((product) => {
                  const displayPrice = getDisplayPrice(product);
                  const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > 0 && Number(product.compare_at_price) < Number(product.price);

                  return (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className="group border rounded-lg overflow-hidden text-left hover:border-primary hover:shadow-md transition-all bg-card"
                    >
                      <div className="aspect-square bg-muted relative">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingCart className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(displayPrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(Number(product.price))}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Variant Selector Popover */}
          {variantProduct && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-card border rounded-lg p-6 w-full max-w-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{variantProduct.name}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setVariantProduct(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {variantProduct.sizes && variantProduct.sizes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Select value={variantSize || ''} onValueChange={setVariantSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {variantProduct.sizes.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {variantProduct.colors && variantProduct.colors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select value={variantColor || ''} onValueChange={setVariantColor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {variantProduct.colors.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full" onClick={confirmVariant}>
                  Add to Order
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Cart & Customer */}
        <div className="lg:w-[40%] flex flex-col min-h-0 border rounded-lg bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order Cart ({orderItems.reduce((s, i) => s + i.quantity, 0)})
            </h2>
            {orderItems.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Cart Items */}
              {orderItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Click products to add them
                </p>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div key={`${item.product.id}-${item.size}-${item.color}-${index}`} className="flex gap-3 items-start">
                      <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                        {item.product.images?.[0] ? (
                          <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatCurrency(getDisplayPrice(item.product))}</span>
                          {item.size && <Badge variant="outline" className="text-xs px-1 py-0">{item.size}</Badge>}
                          {item.color && <Badge variant="outline" className="text-xs px-1 py-0">{item.color}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(index, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(index, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="ml-auto text-sm font-medium">
                            {formatCurrency(getDisplayPrice(item.product) * item.quantity)}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeItem(index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Customer Details */}
              <Collapsible open={customerOpen} onOpenChange={setCustomerOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold py-1">
                  Customer Details
                  <Badge variant="outline" className="text-xs">{customerOpen ? 'Hide' : 'Show'}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Full Name *</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Customer name" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone *</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Address *</Label>
                    <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street address" className="h-9" />
                  </div>
                  <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apt, suite, etc. (optional)" className="h-9" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">City *</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State</Label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Postal Code</Label>
                      <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal code" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Country</Label>
                      <Input value={country} onChange={(e) => setCountry(e.target.value)} className="h-9" />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Payment & Shipping */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Payment & Shipping</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shipping Fee (BDT)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Order Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Order Summary & Place Order */}
          <div className="p-4 border-t space-y-3 bg-muted/30">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleSubmit}
              disabled={submitting || orderItems.length === 0}
            >
              {submitting ? 'Creating Order...' : `Place Order — ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
