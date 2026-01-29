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
const DEBOUNCE_DELAY = 1500; // 1.5 seconds for faster capture

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

function createEphemeralSessionId(): string {
  return crypto.randomUUID();
}

export function useIncompleteOrderCapture(source: 'checkout' | 'quick_buy') {
  // IMPORTANT:
  // - checkout: stable session id (so the same abandoned checkout updates one row)
  // - quick_buy: new session id per attempt (so quick orders don't overwrite previous ones)
  const sessionId = useRef(source === 'checkout' ? getOrCreateSessionId() : createEphemeralSessionId());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedData = useRef<string>('');
  const incompleteOrderId = useRef<string | null>(null);
  const pendingData = useRef<IncompleteOrderData | null>(null);

  const rotateSession = useCallback(() => {
    const newSessionId = crypto.randomUUID();
    if (source === 'checkout') {
      sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
    }
    sessionId.current = newSessionId;
    incompleteOrderId.current = null;
    lastSavedData.current = '';
    pendingData.current = null;
  }, [source]);

  const saveIncompleteOrder = useCallback(async (data: IncompleteOrderData) => {
    // Only save if we have at least phone OR name
    if (!data.phone?.trim() && !data.full_name?.trim()) {
      console.log('[IncompleteOrder] Skipping save - no phone or name provided');
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
      console.log('[IncompleteOrder] Skipping save - data unchanged');
      return;
    }

    console.log('[IncompleteOrder] Saving incomplete order...', { sessionId: sessionId.current, source: data.source });

    try {
      const cartItemsJson = data.cart_items.map(item => ({
        product_id: item.product_id,
        product_name: item.product?.name || 'Unknown',
        product_image: item.product?.images?.[0] || null,
        quantity: item.quantity,
        size: item.size || null,
        color: item.color || null,
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
        console.log('[IncompleteOrder] Updating existing record:', incompleteOrderId.current);
        const { error } = await supabase
          .from('incomplete_orders')
          .update(orderData)
          .eq('id', incompleteOrderId.current);

        if (error) {
          console.error('[IncompleteOrder] Error updating:', error);
          return;
        }
        console.log('[IncompleteOrder] Updated successfully');
      } else {
        // Check if we already have a pending order for this session
        const { data: existing, error: fetchError } = await supabase
          .from('incomplete_orders')
          .select('id')
          .eq('session_id', sessionId.current)
          .eq('status', 'pending')
          .maybeSingle();

        if (fetchError) {
          console.error('[IncompleteOrder] Error fetching existing:', fetchError);
        }

        if (existing) {
          incompleteOrderId.current = existing.id;
          console.log('[IncompleteOrder] Found existing record, updating:', existing.id);
          const { error } = await supabase
            .from('incomplete_orders')
            .update(orderData)
            .eq('id', existing.id);

          if (error) {
            console.error('[IncompleteOrder] Error updating existing:', error);
            return;
          }
          console.log('[IncompleteOrder] Updated successfully');
        } else {
          // Create new record
          console.log('[IncompleteOrder] Creating new record');
          const { data: newOrder, error } = await supabase
            .from('incomplete_orders')
            .insert(orderData)
            .select('id')
            .single();

          if (error) {
            console.error('[IncompleteOrder] Error creating:', error);
            return;
          }

          incompleteOrderId.current = newOrder.id;
          console.log('[IncompleteOrder] Created successfully:', newOrder.id);
        }
      }

      lastSavedData.current = dataHash;
    } catch (error) {
      console.error('[IncompleteOrder] Error saving:', error);
    }
  }, []);

  const debouncedSave = useCallback((data: IncompleteOrderData) => {
    // Store pending data for potential immediate save
    pendingData.current = data;
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveIncompleteOrder(data);
      pendingData.current = null;
    }, DEBOUNCE_DELAY);
  }, [saveIncompleteOrder]);

  const captureFormData = useCallback((data: IncompleteOrderData) => {
    debouncedSave({ ...data, source });
  }, [debouncedSave, source]);

  // Immediately save pending data (call on blur or before navigation)
  const saveImmediately = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    
    if (pendingData.current) {
      await saveIncompleteOrder(pendingData.current);
      pendingData.current = null;
    }
  }, [saveIncompleteOrder]);

  const markAsConverted = useCallback(async (orderId: string) => {
    try {
      // Save any pending data first
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      console.log('[IncompleteOrder] Marking as converted for order:', orderId);
      
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
        console.error('[IncompleteOrder] Error marking as converted:', error);
      } else {
        console.log('[IncompleteOrder] Marked as converted successfully');
      }

      // Clear local refs
      incompleteOrderId.current = null;
      lastSavedData.current = '';
      pendingData.current = null;
      
       // Generate new session ID for future orders
       rotateSession();
    } catch (error) {
      console.error('[IncompleteOrder] Error in markAsConverted:', error);
    }
  }, [rotateSession]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously try to save if we have pending data
      if (pendingData.current && (pendingData.current.phone?.trim() || pendingData.current.full_name?.trim())) {
        // Use sendBeacon for reliable unload saving
        const cartItemsJson = pendingData.current.cart_items.map(item => ({
          product_id: item.product_id,
          product_name: item.product?.name || 'Unknown',
          product_image: item.product?.images?.[0] || null,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          price: item.product?.price || 0,
        }));

        const orderData = {
          session_id: sessionId.current,
          full_name: pendingData.current.full_name?.trim() || null,
          phone: pendingData.current.phone?.trim() || null,
          email: pendingData.current.email?.trim() || null,
          address: pendingData.current.address?.trim() || null,
          shipping_location: pendingData.current.shipping_location || null,
          payment_method: pendingData.current.payment_method || null,
          notes: pendingData.current.notes?.trim() || null,
          cart_items: cartItemsJson,
          subtotal: pendingData.current.subtotal,
          shipping_fee: pendingData.current.shipping_fee,
          total: pendingData.current.total,
          source: pendingData.current.source,
          last_updated_at: new Date().toISOString(),
        };

        // Try to save via sendBeacon (more reliable on page close)
        // Use POST without on_conflict to always create a new record
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/incomplete_orders`;
        
        const blob = new Blob([JSON.stringify(orderData)], { type: 'application/json' });
        // sendBeacon doesn't support custom headers, so we add apikey as query param
        navigator.sendBeacon(url + '?apikey=' + import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    captureFormData,
    markAsConverted,
    saveImmediately,
    rotateSession,
    sessionId: sessionId.current,
  };
}
