import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

interface FacebookEventData {
  event_name: string;
  event_id: string;
  event_time: number;
  event_source_url: string;
  user_data: {
    client_ip_address?: string;
    client_user_agent: string;
    fbc?: string;
    fbp?: string;
    em?: string;
    ph?: string;
    fn?: string;
    ln?: string;
    external_id?: string;
  };
  custom_data?: Record<string, any>;
  action_source: 'website';
}

// Generate unique event ID for deduplication
function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get Facebook cookies
function getFacebookCookies() {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return {
    fbc: cookies['_fbc'] || undefined,
    fbp: cookies['_fbp'] || undefined,
  };
}

// Initialize Facebook Pixel
export function initFacebookPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') return;

  // Check if already initialized
  if (window.fbq) return;

  const f = window;
  const b = document;
  const e = 'script';
  
  const n: any = (f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  
  const t = b.createElement(e) as HTMLScriptElement;
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  
  const s = b.getElementsByTagName(e)[0];
  s?.parentNode?.insertBefore(t, s);

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

// Track browser event
function trackBrowserEvent(eventName: string, parameters?: Record<string, any>, eventId?: string) {
  if (typeof window !== 'undefined' && window.fbq) {
    if (eventId) {
      window.fbq('track', eventName, parameters, { eventID: eventId });
    } else {
      window.fbq('track', eventName, parameters);
    }
  }
}

// Send server event via edge function
async function sendServerEvent(
  pixelId: string,
  accessToken: string,
  eventData: FacebookEventData
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('facebook-capi', {
      body: {
        pixel_id: pixelId,
        access_token: accessToken,
        event_data: eventData,
      },
    });

    if (error) {
      console.error('Facebook CAPI error:', error);
    }
  } catch (err) {
    console.error('Failed to send Facebook server event:', err);
  }
}

// Unified tracking function
export async function trackFacebookEvent(
  pixelId: string,
  capiEnabled: boolean,
  accessToken: string,
  eventName: string,
  customData?: Record<string, any>,
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    externalId?: string;
  }
) {
  if (!pixelId) return;

  const eventId = generateEventId();
  const { fbc, fbp } = getFacebookCookies();

  // Always track browser event
  trackBrowserEvent(eventName, customData, eventId);

  // Send server event if CAPI is enabled and access token is provided
  if (capiEnabled && accessToken) {
    const eventData: FacebookEventData = {
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: window.location.href,
      user_data: {
        client_user_agent: navigator.userAgent,
        fbc,
        fbp,
        em: userData?.email,
        ph: userData?.phone,
        fn: userData?.firstName,
        ln: userData?.lastName,
        external_id: userData?.externalId,
      },
      custom_data: customData,
      action_source: 'website',
    };

    await sendServerEvent(pixelId, accessToken, eventData);
  }
}

// Standard events
export const FacebookEvents = {
  PageView: 'PageView',
  ViewContent: 'ViewContent',
  AddToCart: 'AddToCart',
  AddToWishlist: 'AddToWishlist',
  InitiateCheckout: 'InitiateCheckout',
  AddPaymentInfo: 'AddPaymentInfo',
  Purchase: 'Purchase',
  Lead: 'Lead',
  CompleteRegistration: 'CompleteRegistration',
  Search: 'Search',
} as const;

export type FacebookEventName = typeof FacebookEvents[keyof typeof FacebookEvents];
