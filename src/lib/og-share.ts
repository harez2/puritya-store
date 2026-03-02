/**
 * Generate an OG-proxied share URL that serves proper meta tags to crawlers.
 */
export function getShareUrl(path: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'kmbcslfbhpcmxvdsokja';
  return `https://${projectId}.supabase.co/functions/v1/og-meta?path=${encodeURIComponent(path)}`;
}
