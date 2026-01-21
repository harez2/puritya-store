import { useEffect } from 'react';

export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

const UTM_STORAGE_KEY = 'puritya_utm_params';

// Extract UTM parameters from URL and store them
export function captureUtmParams(): void {
  if (typeof window === 'undefined') return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const utm_source = urlParams.get('utm_source');
  const utm_medium = urlParams.get('utm_medium');
  const utm_campaign = urlParams.get('utm_campaign');
  
  // Only store if at least one UTM param is present
  if (utm_source || utm_medium || utm_campaign) {
    const utmData: UtmParams = {
      utm_source,
      utm_medium,
      utm_campaign,
    };
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
  }
}

// Get stored UTM parameters
export function getUtmParams(): UtmParams {
  if (typeof window === 'undefined') {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
  
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading UTM params:', e);
  }
  
  return { utm_source: null, utm_medium: null, utm_campaign: null };
}

// Clear UTM parameters (after order is placed)
export function clearUtmParams(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(UTM_STORAGE_KEY);
}

// Get a display-friendly source name
export function getUtmSourceDisplay(utmParams: UtmParams): string {
  const { utm_source, utm_medium, utm_campaign } = utmParams;
  
  if (!utm_source && !utm_medium && !utm_campaign) {
    return 'Direct';
  }
  
  // Build a display string
  const parts: string[] = [];
  
  if (utm_source) {
    // Capitalize first letter of source
    parts.push(utm_source.charAt(0).toUpperCase() + utm_source.slice(1).toLowerCase());
  }
  
  if (utm_medium && !parts.length) {
    parts.push(utm_medium.charAt(0).toUpperCase() + utm_medium.slice(1).toLowerCase());
  }
  
  return parts.join(' / ') || 'Unknown';
}

// Hook to capture UTM params on mount
export function useUtmTracking(): void {
  useEffect(() => {
    captureUtmParams();
  }, []);
}
