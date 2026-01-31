/**
 * Utility functions for generating order numbers
 */

/**
 * Gets the domain prefix (first 3 uppercase letters of the domain)
 * @returns The 3-letter uppercase prefix derived from the domain
 */
export function getDomainPrefix(): string {
  const hostname = window.location.hostname;
  // Remove www. and get first part before any dots
  const domain = hostname.replace(/^www\./, '').split('.')[0];
  // Handle localhost and similar cases
  if (domain === 'localhost' || domain.includes('-preview')) {
    return 'DEV';
  }
  return domain.slice(0, 3).toUpperCase();
}

/**
 * Generates an order number with the given prefix
 * @param prefix The prefix to use for the order number
 * @returns A formatted order number like "PUR-20260131-1234"
 */
export function generateOrderNumber(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix.toUpperCase()}-${date}-${random}`;
}

/**
 * Gets the appropriate order prefix based on settings
 * @param useDomainPrefix Whether to auto-derive prefix from domain
 * @param customPrefix Custom prefix if not using domain
 * @returns The resolved prefix to use
 */
export function getOrderPrefix(useDomainPrefix: boolean, customPrefix: string): string {
  if (useDomainPrefix) {
    return getDomainPrefix();
  }
  return customPrefix || 'ORD';
}
