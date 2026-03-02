import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastConfirmedAdmin = useRef(false);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        lastConfirmedAdmin.current = false;
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('is_admin', { _user_id: user.id });

        if (error) {
          console.error('Error checking admin status:', error);
          // On transient errors (e.g. token refresh), keep previous admin state
          if (lastConfirmedAdmin.current) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          const result = data === true;
          setIsAdmin(result);
          lastConfirmedAdmin.current = result;
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        if (lastConfirmedAdmin.current) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}
