import { useState, useEffect, useCallback } from 'react';
import { supabase, Product } from '@/lib/supabase';

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 8;

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Get stored product IDs from localStorage
  const getStoredIds = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save product IDs to localStorage
  const saveIds = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)));
    } catch (error) {
      console.error('Error saving recently viewed:', error);
    }
  }, []);

  // Add a product to recently viewed
  const addProduct = useCallback((productId: string) => {
    const ids = getStoredIds();
    // Remove if already exists, then add to front
    const filtered = ids.filter(id => id !== productId);
    const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
    saveIds(updated);
  }, [getStoredIds, saveIds]);

  // Fetch products from stored IDs
  const fetchProducts = useCallback(async () => {
    const ids = getStoredIds();
    if (ids.length === 0) {
      setRecentlyViewed([]);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .in('id', ids);

      if (data) {
        // Sort by the order in localStorage
        const sorted = ids
          .map(id => data.find(p => p.id === id))
          .filter((p): p is NonNullable<typeof p> => p !== undefined);
        setRecentlyViewed(sorted as Product[]);
      }
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
    } finally {
      setLoading(false);
    }
  }, [getStoredIds]);

  // Fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    recentlyViewed,
    loading,
    addProduct,
    refresh: fetchProducts,
  };
}
