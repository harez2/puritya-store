import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

function injectGtagScript(measurementId: string) {
  if (typeof window === 'undefined') return;
  if (document.querySelector(`script[data-ga="${measurementId}"]`)) return;

  // Load gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.setAttribute('data-ga', measurementId);
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  console.log('[GA4] Initialized with measurement ID:', measurementId);
}

export function GoogleAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSiteSettings();
  const location = useLocation();
  const initialized = useRef(false);

  // Inject script when enabled
  useEffect(() => {
    if (loading) return;
    if (settings.ga_enabled && settings.ga_measurement_id) {
      injectGtagScript(settings.ga_measurement_id);
      initialized.current = true;
    }
  }, [settings.ga_enabled, settings.ga_measurement_id, loading]);

  // Track page views on route changes
  useEffect(() => {
    if (!initialized.current || !settings.ga_enabled || !settings.ga_measurement_id) return;
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location.pathname, location.search, settings.ga_enabled, settings.ga_measurement_id]);

  return <>{children}</>;
}
