import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';

interface Popup {
  id: string;
  title: string;
  content: string | null;
  cta_text: string | null;
  cta_link: string | null;
  cta_enabled: boolean;
  is_active: boolean;
  auto_close_seconds: number | null;
  show_close_button: boolean;
  background_color: string | null;
  text_color: string | null;
  display_delay_seconds: number | null;
  show_once_per_session: boolean | null;
  image_url: string | null;
}
export function SitePopup() {
  const location = useLocation();
  const [visiblePopup, setVisiblePopup] = useState<Popup | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedPopups, setDismissedPopups] = useState<Set<string>>(() => {
    const stored = sessionStorage.getItem('dismissed_popups');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Don't show popups in admin area
  const isAdminArea = location.pathname.startsWith('/admin');

  const { data: popups = [] } = useQuery({
    queryKey: ['active-popups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popups')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Popup[];
    },
    enabled: !isAdminArea,
  });

  useEffect(() => {
    if (isAdminArea || popups.length === 0) {
      setVisiblePopup(null);
      return;
    }

    // Find the first popup that hasn't been dismissed (if show_once_per_session)
    const availablePopup = popups.find(popup => {
      if (popup.show_once_per_session && dismissedPopups.has(popup.id)) {
        return false;
      }
      return true;
    });

    if (!availablePopup) {
      setVisiblePopup(null);
      return;
    }

    // Apply display delay
    const delay = (availablePopup.display_delay_seconds || 0) * 1000;
    const showTimer = setTimeout(() => {
      setVisiblePopup(availablePopup);
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(showTimer);
  }, [popups, isAdminArea, dismissedPopups]);

  // Handle auto-close
  useEffect(() => {
    if (!visiblePopup || !isVisible) return;

    const autoClose = visiblePopup.auto_close_seconds;
    if (!autoClose || autoClose <= 0) return;

    const timer = setTimeout(() => {
      handleClose();
    }, autoClose * 1000);

    return () => clearTimeout(timer);
  }, [visiblePopup, isVisible]);

  const handleClose = () => {
    if (!visiblePopup) return;

    setIsVisible(false);
    
    if (visiblePopup.show_once_per_session) {
      const newDismissed = new Set(dismissedPopups);
      newDismissed.add(visiblePopup.id);
      setDismissedPopups(newDismissed);
      sessionStorage.setItem('dismissed_popups', JSON.stringify([...newDismissed]));
    }

    // Clear popup after animation
    setTimeout(() => setVisiblePopup(null), 300);
  };

  const handleCtaClick = () => {
    if (visiblePopup?.cta_link) {
      window.open(visiblePopup.cta_link, '_blank', 'noopener,noreferrer');
    }
    handleClose();
  };

  if (!visiblePopup || isAdminArea) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={visiblePopup.show_close_button ? handleClose : undefined}
      />
      
      {/* Popup Content */}
      <div 
        className={`relative max-w-md w-full rounded-lg shadow-2xl transform transition-all duration-300 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
        style={{ 
          backgroundColor: visiblePopup.background_color || '#ffffff',
          color: visiblePopup.text_color || '#000000'
        }}
      >
        {/* Close Button */}
        {visiblePopup.show_close_button && (
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 transition-colors z-10"
            style={{ color: visiblePopup.image_url ? '#ffffff' : (visiblePopup.text_color || '#000000') }}
            aria-label="Close popup"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Banner Image */}
        {visiblePopup.image_url && (
          <div className="w-full aspect-[16/9] overflow-hidden rounded-t-lg">
            <img 
              src={visiblePopup.image_url} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          {/* Title */}
          <h2 className="text-xl font-bold mb-2 pr-8">
            {visiblePopup.title}
          </h2>

          {/* Content */}
          {visiblePopup.content && (
            <p className="mb-4 opacity-90">
              {visiblePopup.content}
            </p>
          )}

          {/* CTA Button */}
          {visiblePopup.cta_enabled && visiblePopup.cta_text && (
            <Button
              onClick={handleCtaClick}
              className="w-full"
              style={{
                backgroundColor: visiblePopup.text_color || '#000000',
                color: visiblePopup.background_color || '#ffffff',
              }}
            >
              {visiblePopup.cta_text}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
