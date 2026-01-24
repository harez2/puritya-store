import { useEffect } from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

// Initialize GTM script in head
function initGTMHead(containerId: string) {
  if (typeof window === 'undefined') return;
  
  // Check if already initialized
  if (document.querySelector(`script[data-gtm="${containerId}"]`)) return;
  
  // Create script tag for head
  const script = document.createElement('script');
  script.setAttribute('data-gtm', containerId);
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${containerId}');
  `;
  document.head.insertBefore(script, document.head.firstChild);
  
  console.log('[GTM] Initialized with container:', containerId);
}

// Add GTM noscript iframe to body
function initGTMBody(containerId: string) {
  if (typeof window === 'undefined') return;
  
  // Check if already initialized
  if (document.querySelector(`noscript[data-gtm-noscript="${containerId}"]`)) return;
  
  // Create noscript iframe
  const noscript = document.createElement('noscript');
  noscript.setAttribute('data-gtm-noscript', containerId);
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  
  if (document.body.firstChild) {
    document.body.insertBefore(noscript, document.body.firstChild);
  } else {
    document.body.appendChild(noscript);
  }
}

export function GoogleTagManagerProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSiteSettings();
  
  useEffect(() => {
    if (loading) return;
    
    if (settings.gtm_enabled && settings.gtm_container_id) {
      initGTMHead(settings.gtm_container_id);
      initGTMBody(settings.gtm_container_id);
    }
  }, [settings.gtm_enabled, settings.gtm_container_id, loading]);
  
  return <>{children}</>;
}
