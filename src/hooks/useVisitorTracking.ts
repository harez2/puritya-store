import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_STORAGE_KEY = 'puritya_visitor_session_id';

// Generate a unique session ID
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

// Track visitor session with UTM data
async function trackVisitorSession(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const sessionId = getSessionId();
  const urlParams = new URLSearchParams(window.location.search);
  
  const utm_source = urlParams.get('utm_source');
  const utm_medium = urlParams.get('utm_medium');
  const utm_campaign = urlParams.get('utm_campaign');
  
  // Only track if session hasn't been tracked yet
  const trackingKey = `puritya_session_tracked_${sessionId}`;
  if (sessionStorage.getItem(trackingKey)) return;
  
  try {
    const { error } = await supabase.from('visitor_sessions').insert({
      session_id: sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      landing_page: window.location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
    
    if (!error) {
      sessionStorage.setItem(trackingKey, 'true');
    }
  } catch (e) {
    console.error('Error tracking visitor session:', e);
  }
}

// Hook to track visitor on mount
export function useVisitorTracking(): void {
  useEffect(() => {
    trackVisitorSession();
  }, []);
}

export { getSessionId };
