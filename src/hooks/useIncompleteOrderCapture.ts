import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  product_id: string;
  quantity: number;
  size?: string | null;
  color?: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
  };
}

interface IncompleteOrderData {
  full_name: string;
  phone: string;
  email?: string;
  address: string;
  shipping_location?: string;
  payment_method?: string;
  notes?: string;
  cart_items: CartItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  source: 'checkout' | 'quick_buy';
}

const SESSION_ID_KEY = 'incomplete_order_session_id';
const DEBOUNCE_DELAY = 2000; // 2 seconds

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function useIncompleteOrderCapture(source: 'checkout' | 'quick_buy') {
  const sessionId = useRef(getOrCreateSessionId());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedData = useRef<string>('');
  const incompleteOrderId = useRef<string | null>(null);

  const saveIncompleteOrder = useCallback(async (data: IncompleteOrderData) => {
    // Only save if we have at least phone OR name
    if (!data.phone?.trim() && !data.full_name?.trim()) {
      return;
    }

    // Create a hash of the data to check if it's changed
    const dataHash = JSON.stringify({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      shipping_location: data.shipping_location,
      payment_method: data.payment_method,
      notes: data.notes,
      cart_items: data.cart_items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
      subtotal: data.subtotal,
      shipping_fee: data.shipping_fee,
      total: data.total,
    });

    // Skip if data hasn't changed
    if (dataHash === lastSavedData.current) {
      return;
    }

    try {
      const cartItemsJson = data.cart_items.map(item => ({
        product_id: item.product_id,
        product_name: item.product?.name || 'Unknown',
        product_image: item.product?.images?.[0] || null,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.product?.price || 0,
      }));

      const orderData = {
        session_id: sessionId.current,
        full_name: data.full_name?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        shipping_location: data.shipping_location || null,
        payment_method: data.payment_method || null,
        notes: data.notes?.trim() || null,
        cart_items: cartItemsJson,
        subtotal: data.subtotal,
        shipping_fee: data.shipping_fee,
        total: data.total,
        source: data.source,
        last_updated_at: new Date().toISOString(),
      };

      if (incompleteOrderId.current) {
        // Update existing record
        const { error } = await supabase
          .from('incomplete_orders')
          .update(orderData)
          .eq('id', incompleteOrderId.current);

        if (error) {
          console.error('Error updating incomplete order:', error);
          return;
        }
      } else {
        // Check if we already have a pending order for this session
        const { data: existing } = await supabase
          .from('incomplete_orders')
          .select('id')
          .eq('session_id', sessionId.current)
          .eq('status', 'pending')
          .maybeSingle();

        if (existing) {
          incompleteOrderId.current = existing.id;
          const { error } = await supabase
            .from('incomplete_orders')
            .update(orderData)
            .eq('id', existing.id);

          if (error) {
            console.error('Error updating incomplete order:', error);
            return;
          }
        } else {
          // Create new record
          const { data: newOrder, error } = await supabase
            .from('incomplete_orders')
            .insert(orderData)
            .select('id')
            .single();

          if (error) {
            console.error('Error creating incomplete order:', error);
            return;
          }

          incompleteOrderId.current = newOrder.id;
        }
      }

      lastSavedData.current = dataHash;
    } catch (error) {
      console.error('Error saving incomplete order:', error);
    }
  }, [source]);

  const debouncedSave = useCallback((data: IncompleteOrderData) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveIncompleteOrder(data);
    }, DEBOUNCE_DELAY);
  }, [saveIncompleteOrder]);

  const captureFormData = useCallback((data: IncompleteOrderData) => {
    debouncedSave({ ...data, source });
  }, [debouncedSave, source]);

  const markAsConverted = useCallback(async (orderId: string) => {
    try {
      // Find and update incomplete orders with this session
      const { error } = await supabase
        .from('incomplete_orders')
        .update({
          status: 'converted',
          converted_order_id: orderId,
          last_updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId.current)
        .eq('status', 'pending');

      if (error) {
        console.error('Error marking incomplete order as converted:', error);
      }

      // Clear local refs
      incompleteOrderId.current = null;
      lastSavedData.current = '';
      
      // Generate new session ID for future orders
      const newSessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
      sessionId.current = newSessionId;
    } catch (error) {
      console.error('Error in markAsConverted:', error);
    }
  }, []);

  // Cleanup on unmount - save any pending data immediately
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    captureFormData,
    markAsConverted,
    sessionId: sessionId.current,
  };
}
