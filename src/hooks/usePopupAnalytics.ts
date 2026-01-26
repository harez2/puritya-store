import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type PopupEventType = 'view' | 'click' | 'close';

// Generate or get session ID for anonymous tracking
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('popup_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('popup_session_id', sessionId);
  }
  return sessionId;
}

// Detect device type
function getDeviceType(): string {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function usePopupAnalytics() {
  const { user } = useAuth();

  const trackEvent = useCallback(async (
    popupId: string,
    eventType: PopupEventType,
    pagePath?: string
  ) => {
    try {
      const { error } = await supabase
        .from('popup_analytics')
        .insert({
          popup_id: popupId,
          event_type: eventType,
          session_id: getSessionId(),
          user_id: user?.id || null,
          device_type: getDeviceType(),
          page_path: pagePath || (typeof window !== 'undefined' ? window.location.pathname : null),
        });

      if (error) {
        console.error('Failed to track popup event:', error);
      }
    } catch (err) {
      console.error('Error tracking popup event:', err);
    }
  }, [user?.id]);

  const trackView = useCallback((popupId: string, pagePath?: string) => {
    trackEvent(popupId, 'view', pagePath);
  }, [trackEvent]);

  const trackClick = useCallback((popupId: string, pagePath?: string) => {
    trackEvent(popupId, 'click', pagePath);
  }, [trackEvent]);

  const trackClose = useCallback((popupId: string, pagePath?: string) => {
    trackEvent(popupId, 'close', pagePath);
  }, [trackEvent]);

  return { trackView, trackClick, trackClose };
}

// Analytics data types for admin display
export interface PopupAnalyticsSummary {
  popup_id: string;
  views: number;
  clicks: number;
  closes: number;
  conversion_rate: number;
}
