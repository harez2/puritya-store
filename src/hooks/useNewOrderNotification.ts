import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  browserEnabled: boolean;
  smsEnabled: boolean;
  adminPhone: string;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  browserEnabled: true,
  smsEnabled: false,
  adminPhone: '',
};

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    // Play a pleasant two-tone chime
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

async function sendAdminSms(phone: string, orderNumber: string, total: number, customerName: string) {
  try {
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'sms_settings')
      .maybeSingle();

    const smsSettings = settingsData?.value as {
      enabled?: boolean;
      apiKey?: string;
      senderId?: string;
      useCustomApi?: boolean;
    } | null;

    if (!smsSettings?.enabled) return;

    const message = `New order #${orderNumber} received! Total: ৳${total.toLocaleString()}. Customer: ${customerName}`;

    const requestBody: { phone: string; message: string; customApiKey?: string; customSenderId?: string } = {
      phone,
      message,
    };

    if (smsSettings.useCustomApi && smsSettings.apiKey && smsSettings.senderId) {
      requestBody.customApiKey = smsSettings.apiKey;
      requestBody.customSenderId = smsSettings.senderId;
    }

    await supabase.functions.invoke('send-sms', { body: requestBody });
  } catch (e) {
    console.error('Failed to send admin SMS notification:', e);
  }
}

export function useNewOrderNotification() {
  const settingsRef = useRef<NotificationSettings>(defaultSettings);

  // Fetch notification settings
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

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleNewOrder = useCallback((payload: any) => {
    const s = settingsRef.current;
    if (!s.enabled) return;

    const order = payload.new;
    const orderNumber = order.order_number || 'N/A';
    const total = order.total || 0;
    const shippingAddress = order.shipping_address as any;
    const customerName = shippingAddress?.full_name || 'Guest';

    // Sound
    if (s.soundEnabled) {
      playNotificationSound();
    }

    // Browser notification
    if (s.browserEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🛒 New Order!', {
        body: `Order #${orderNumber} — ৳${total.toLocaleString()} from ${customerName}`,
        icon: '/favicon.ico',
      });
    }

    // Toast
    toast.success(`New Order #${orderNumber}`, {
      description: `৳${total.toLocaleString()} from ${customerName}`,
      duration: 5000,
    });

    // SMS
    if (s.smsEnabled && s.adminPhone) {
      sendAdminSms(s.adminPhone, orderNumber, total, customerName);
    }
  }, []);

  // Subscribe to realtime
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
