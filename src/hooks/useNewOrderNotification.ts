import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// SMS notifications are handled server-side by the notify_admin_on_new_order database trigger.

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  browserEnabled: boolean;
  smsEnabled: boolean;
  adminPhone: string; // legacy single phone
  adminPhones: string[]; // new: multiple phones
  adminSmsTemplate: string;
}

const DEFAULT_TEMPLATE = 'New order #{order_number} received! Total: ৳{total}. Customer: {customer_name}';

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  browserEnabled: true,
  smsEnabled: false,
  adminPhone: '',
  adminPhones: [],
  adminSmsTemplate: DEFAULT_TEMPLATE,
};

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(830, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1050, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
}

export function useNewOrderNotification() {
  const settingsRef = useRef<NotificationSettings>(defaultSettings);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'admin_notification_settings')
        .maybeSingle();

      if (data?.value) {
        settingsRef.current = { ...defaultSettings, ...(data.value as unknown as NotificationSettings) };
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleNewOrder = useCallback((payload: any) => {
    const s = settingsRef.current;
    if (!s.enabled) return;

    const order = payload.new;
    
    // Skip notification for POS orders marked as silent
    const orderSource = order.order_source || '';
    if (orderSource.endsWith('__silent')) return;

    const orderNumber = order.order_number || 'N/A';
    const total = order.total || 0;
    const shippingAddress = order.shipping_address as any;
    const customerName = shippingAddress?.full_name || 'Guest';

    if (s.soundEnabled) {
      playNotificationSound();
    }

    if (s.browserEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🛒 New Order!', {
        body: `Order #${orderNumber} — ৳${total.toLocaleString()} from ${customerName}`,
        icon: '/favicon.ico',
      });
    }

    toast.success(`New Order #${orderNumber}`, {
      description: `৳${total.toLocaleString()} from ${customerName}`,
      duration: 5000,
    });

    // SMS is handled server-side by the database trigger, no client-side SMS here
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        handleNewOrder
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNewOrder]);
}
