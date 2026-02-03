import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { initFacebookPixel, trackFacebookEvent, FacebookEvents } from '@/lib/facebook-pixel';

export function useFacebookPixel() {
  const { settings } = useSiteSettings();
  const location = useLocation();

  // Initialize pixel when settings load
  useEffect(() => {
    if (settings.facebook_pixel_id) {
      initFacebookPixel(settings.facebook_pixel_id);
    }
  }, [settings.facebook_pixel_id]);

  // Track page views on route change
  useEffect(() => {
    if (settings.facebook_pixel_id && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'PageView');
      
      // Also send server event if CAPI enabled (token is stored server-side only)
      if (settings.facebook_capi_enabled) {
        trackFacebookEvent(
          settings.facebook_pixel_id,
          settings.facebook_capi_enabled,
          FacebookEvents.PageView
        );
      }
    }
  }, [location.pathname, settings.facebook_pixel_id, settings.facebook_capi_enabled]);
}

// Hook to get tracking function with current settings
export function useFacebookTracking() {
  const { settings } = useSiteSettings();

  const track = (
    eventName: string,
    customData?: Record<string, any>,
    userData?: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      externalId?: string;
    }
  ) => {
    if (settings.facebook_pixel_id) {
      trackFacebookEvent(
        settings.facebook_pixel_id,
        settings.facebook_capi_enabled,
        eventName,
        customData,
        userData
      );
    }
  };

  return { track, FacebookEvents };
}
