import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase, CartItem, Product } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useSiteSettings } from './SiteSettingsContext';
import { trackFacebookEvent, FacebookEvents } from '@/lib/facebook-pixel';

export type CartItemWithProduct = {
  id: string;
  product_id: string;
  quantity: number;
  size: string | null;
  color: string | null;
  product?: Product;
  user_id?: string;
  created_at?: string;
};

type CartContextType = {
  items: CartItemWithProduct[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  isGuestCart: boolean;
  addToCart: (productId: string, quantity?: number, size?: string, color?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getGuestCartItems: () => CartItemWithProduct[];
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = 'puritya_guest_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Facebook tracking helper
  const trackAddToCart = (product: Product, quantity: number) => {
    if (settings.facebook_pixel_id) {
      trackFacebookEvent(
        settings.facebook_pixel_id,
        settings.facebook_capi_enabled,
        settings.facebook_access_token || '',
        FacebookEvents.AddToCart,
        {
          content_ids: [product.id],
          content_name: product.name,
          content_type: 'product',
          value: Number(product.price) * quantity,
          currency: 'BDT',
          num_items: quantity,
        }
      );
    }
  };

  // Load guest cart from localStorage
  const loadGuestCart = async () => {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    if (!stored) {
      setItems([]);
      return;
    }

    try {
      const guestItems: CartItemWithProduct[] = JSON.parse(stored);
      
      // Fetch product details for guest cart items
      if (guestItems.length > 0) {
        const productIds = guestItems.map(item => item.product_id);
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        const itemsWithProducts = guestItems.map(item => ({
          ...item,
          product: products?.find(p => p.id === item.product_id),
        }));

        setItems(itemsWithProducts as CartItemWithProduct[]);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading guest cart:', error);
      setItems([]);
    }
  };

  const saveGuestCart = (cartItems: CartItemWithProduct[]) => {
    const toStore = cartItems.map(({ id, product_id, quantity, size, color }) => ({
      id, product_id, quantity, size, color
    }));
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(toStore));
  };

  const fetchCart = async () => {
    if (!user) {
      await loadGuestCart();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data as any) || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  // Merge guest cart with user cart on login
  const mergeGuestCart = async () => {
    if (!user) return;
    
    const stored = localStorage.getItem(GUEST_CART_KEY);
    if (!stored) return;

    try {
      const guestItems: CartItemWithProduct[] = JSON.parse(stored);
      
      for (const item of guestItems) {
        await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        });
      }

      localStorage.removeItem(GUEST_CART_KEY);
    } catch (error) {
      console.error('Error merging guest cart:', error);
    }
  };

  useEffect(() => {
    if (user) {
      mergeGuestCart().then(() => fetchCart());
    } else {
      fetchCart();
    }
  }, [user]);

  const addToCart = async (productId: string, quantity = 1, size?: string, color?: string) => {
    // Guest cart handling
    if (!user) {
      try {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        const currentItems = [...items];
        const existingIndex = currentItems.findIndex(
          item => item.product_id === productId && item.size === (size || null) && item.color === (color || null)
        );

        if (existingIndex >= 0) {
          currentItems[existingIndex].quantity += quantity;
        } else {
          currentItems.push({
            id: crypto.randomUUID(),
            product_id: productId,
            quantity,
            size: size || null,
            color: color || null,
            product: product as Product,
          });
        }

        setItems(currentItems);
        saveGuestCart(currentItems);

        // Track AddToCart event
        if (product) {
          trackAddToCart(product as Product, quantity);
        }

        toast({
          title: "Added to cart",
          description: "Item has been added to your cart.",
        });
      } catch (error) {
        console.error('Error adding to guest cart:', error);
      }
      return;
    }

    // Logged-in user cart handling
    try {
      const existingItem = items.find(
        item => item.product_id === productId && item.size === size && item.color === color
      );

      if (existingItem) {
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Fetch product details for tracking
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        const { error } = await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          size,
          color,
        });

        if (error) throw error;
        await fetchCart();

        // Track AddToCart event
        if (product) {
          trackAddToCart(product as Product, quantity);
        }
      }

      toast({
        title: "Added to cart",
        description: "Item has been added to your cart.",
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(cartItemId);
      return;
    }

    if (!user) {
      const currentItems = [...items];
      const index = currentItems.findIndex(item => item.id === cartItemId);
      if (index >= 0) {
        currentItems[index].quantity = quantity;
        setItems(currentItems);
        saveGuestCart(currentItems);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) throw error;
      await fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    if (!user) {
      const currentItems = items.filter(item => item.id !== cartItemId);
      setItems(currentItems);
      saveGuestCart(currentItems);
      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      await fetchCart();
      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart.",
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = async () => {
    if (!user) {
      setItems([]);
      localStorage.removeItem(GUEST_CART_KEY);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const getGuestCartItems = () => {
    if (user) return [];
    return items;
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (Number(item.product?.price) || 0) * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      loading,
      itemCount,
      subtotal,
      isGuestCart: !user,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart: fetchCart,
      getGuestCartItems,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
