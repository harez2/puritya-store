// Data Layer for analytics integration (GTM, Meta, etc.)

declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

// Initialize the data layer
export function initDataLayer() {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
}

// Push event to data layer
export function pushToDataLayer(data: Record<string, any>) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
    console.log('[DataLayer] Event pushed:', data);
  }
}

// Standard e-commerce events
export const DataLayerEvents = {
  // Page events
  PAGE_VIEW: 'page_view',
  
  // E-commerce events
  VIEW_ITEM: 'view_item',
  VIEW_ITEM_LIST: 'view_item_list',
  SELECT_ITEM: 'select_item',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  VIEW_CART: 'view_cart',
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_SHIPPING_INFO: 'add_shipping_info',
  ADD_PAYMENT_INFO: 'add_payment_info',
  PURCHASE: 'purchase',
  
  // Wishlist events
  ADD_TO_WISHLIST: 'add_to_wishlist',
  REMOVE_FROM_WISHLIST: 'remove_from_wishlist',
  
  // Search events
  SEARCH: 'search',
  
  // User events
  LOGIN: 'login',
  SIGN_UP: 'sign_up',
} as const;

export type DataLayerEventName = typeof DataLayerEvents[keyof typeof DataLayerEvents];

// Helper to format product for data layer
export interface DataLayerProduct {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
  item_variant?: string;
  index?: number;
}

// Track page view
export function trackPageView(pagePath: string, pageTitle?: string) {
  pushToDataLayer({
    event: DataLayerEvents.PAGE_VIEW,
    page_path: pagePath,
    page_title: pageTitle || document.title,
    timestamp: new Date().toISOString(),
  });
}

// Track product view
export function trackViewItem(product: DataLayerProduct, currency: string = 'USD') {
  pushToDataLayer({
    event: DataLayerEvents.VIEW_ITEM,
    ecommerce: {
      currency,
      value: product.price,
      items: [product],
    },
  });
}

// Track product list view
export function trackViewItemList(
  products: DataLayerProduct[],
  listName: string,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.VIEW_ITEM_LIST,
    ecommerce: {
      currency,
      item_list_name: listName,
      items: products,
    },
  });
}

// Track product selection from list
export function trackSelectItem(
  product: DataLayerProduct,
  listName: string,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.SELECT_ITEM,
    ecommerce: {
      currency,
      item_list_name: listName,
      items: [product],
    },
  });
}

// Track add to cart
export function trackAddToCart(
  product: DataLayerProduct,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.ADD_TO_CART,
    ecommerce: {
      currency,
      value: product.price * (product.quantity || 1),
      items: [product],
    },
  });
}

// Track remove from cart
export function trackRemoveFromCart(
  product: DataLayerProduct,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.REMOVE_FROM_CART,
    ecommerce: {
      currency,
      value: product.price * (product.quantity || 1),
      items: [product],
    },
  });
}

// Track view cart
export function trackViewCart(
  products: DataLayerProduct[],
  totalValue: number,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.VIEW_CART,
    ecommerce: {
      currency,
      value: totalValue,
      items: products,
    },
  });
}

// Track begin checkout
export function trackBeginCheckout(
  products: DataLayerProduct[],
  totalValue: number,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.BEGIN_CHECKOUT,
    ecommerce: {
      currency,
      value: totalValue,
      items: products,
    },
  });
}

// Track shipping info added
export function trackAddShippingInfo(
  products: DataLayerProduct[],
  totalValue: number,
  shippingTier: string,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.ADD_SHIPPING_INFO,
    ecommerce: {
      currency,
      value: totalValue,
      shipping_tier: shippingTier,
      items: products,
    },
  });
}

// Track payment info added
export function trackAddPaymentInfo(
  products: DataLayerProduct[],
  totalValue: number,
  paymentType: string,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.ADD_PAYMENT_INFO,
    ecommerce: {
      currency,
      value: totalValue,
      payment_type: paymentType,
      items: products,
    },
  });
}

// Track purchase
export function trackPurchase(
  transactionId: string,
  products: DataLayerProduct[],
  totalValue: number,
  shipping: number = 0,
  tax: number = 0,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.PURCHASE,
    ecommerce: {
      transaction_id: transactionId,
      currency,
      value: totalValue,
      shipping,
      tax,
      items: products,
    },
  });
}

// Track add to wishlist
export function trackAddToWishlist(
  product: DataLayerProduct,
  currency: string = 'USD'
) {
  pushToDataLayer({
    event: DataLayerEvents.ADD_TO_WISHLIST,
    ecommerce: {
      currency,
      value: product.price,
      items: [product],
    },
  });
}

// Track search
export function trackSearch(searchTerm: string) {
  pushToDataLayer({
    event: DataLayerEvents.SEARCH,
    search_term: searchTerm,
  });
}

// Track login
export function trackLogin(method: string = 'email') {
  pushToDataLayer({
    event: DataLayerEvents.LOGIN,
    method,
  });
}

// Track sign up
export function trackSignUp(method: string = 'email') {
  pushToDataLayer({
    event: DataLayerEvents.SIGN_UP,
    method,
  });
}
