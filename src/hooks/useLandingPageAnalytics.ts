import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type LandingPageEventType = 'view' | 'click' | 'checkout' | 'purchase';

interface TrackEventOptions {
  sectionId?: string;
  productId?: string;
}

export function useLandingPageAnalytics(landingPageId: string) {
  const { user } = useAuth();

  const getSessionId = useCallback(() => {
    let sessionId = sessionStorage.getItem('lp_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('lp_session_id', sessionId);
    }
    return sessionId;
  }, []);

  const getDeviceType = useCallback(() => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, []);

  const getUtmParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    };
  }, []);

  const trackEvent = useCallback(async (
    eventType: LandingPageEventType,
    options: TrackEventOptions = {}
  ) => {
    try {
      const utmParams = getUtmParams();
      
      await supabase.from('landing_page_analytics').insert({
        landing_page_id: landingPageId,
        event_type: eventType,
        session_id: getSessionId(),
        user_id: user?.id || null,
        device_type: getDeviceType(),
        referrer: document.referrer || null,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        section_id: options.sectionId || null,
        product_id: options.productId || null,
      });
    } catch (error) {
      console.error('Failed to track landing page event:', error);
    }
  }, [landingPageId, user?.id, getSessionId, getDeviceType, getUtmParams]);

  const trackView = useCallback(() => {
    trackEvent('view');
  }, [trackEvent]);

  const trackClick = useCallback((sectionId?: string, productId?: string) => {
    trackEvent('click', { sectionId, productId });
  }, [trackEvent]);

  const trackCheckout = useCallback((productId?: string) => {
    trackEvent('checkout', { productId });
  }, [trackEvent]);

  const trackPurchase = useCallback((productId?: string) => {
    trackEvent('purchase', { productId });
  }, [trackEvent]);

  return {
    trackEvent,
    trackView,
    trackClick,
    trackCheckout,
    trackPurchase,
  };
}
