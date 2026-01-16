import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  initDataLayer,
  trackPageView,
  trackViewItem,
  trackViewItemList,
  trackSelectItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  trackAddToWishlist,
  trackSearch,
  trackLogin,
  trackSignUp,
  DataLayerEvents,
  DataLayerProduct,
} from '@/lib/data-layer';

// Hook to initialize data layer and track page views
export function useDataLayerInit() {
  const location = useLocation();

  // Initialize data layer on mount
  useEffect(() => {
    initDataLayer();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
}

// Hook to get all tracking functions
export function useDataLayer() {
  return {
    trackPageView,
    trackViewItem,
    trackViewItemList,
    trackSelectItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackViewCart,
    trackBeginCheckout,
    trackAddShippingInfo,
    trackAddPaymentInfo,
    trackPurchase,
    trackAddToWishlist,
    trackSearch,
    trackLogin,
    trackSignUp,
    DataLayerEvents,
  };
}

export type { DataLayerProduct };
