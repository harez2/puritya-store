import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSlide } from '@/contexts/SiteSettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplayDelay?: number;
  storeName: string;
}

export function HeroSlider({ slides, autoplay = true, autoplayDelay = 5, storeName }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isMobile = useIsMobile();

  // Filter slides based on mobile visibility
  const visibleSlides = useMemo(() => {
    if (isMobile) {
      return slides.filter((slide) => !slide.hide_on_mobile);
    }
    return slides;
  }, [slides, isMobile]);

  // Reset index if it's out of bounds after filtering
  useEffect(() => {
    if (currentIndex >= visibleSlides.length) {
      setCurrentIndex(0);
    }
  }, [visibleSlides.length, currentIndex]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % visibleSlides.length);
  }, [visibleSlides.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + visibleSlides.length) % visibleSlides.length);
  }, [visibleSlides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Autoplay effect
  useEffect(() => {
    if (!autoplay || isPaused || visibleSlides.length <= 1) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoplayDelay * 1000);

    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, isPaused, goToNext, visibleSlides.length]);

  if (visibleSlides.length === 0) return null;

  const currentSlide = visibleSlides[currentIndex];

  // Get content with mobile overrides
  const getContent = (slide: HeroSlide) => {
    if (isMobile) {
      return {
        image_url: slide.mobile_image_url || slide.image_url,
        title: slide.mobile_title || slide.title,
        subtitle: slide.mobile_subtitle || slide.subtitle,
        badge: slide.mobile_badge || slide.badge,
        cta_text: slide.cta_text,
        cta_link: slide.cta_link,
        secondary_cta_text: slide.secondary_cta_text,
        secondary_cta_link: slide.secondary_cta_link,
      };
    }
    return slide;
  };

  const content = getContent(currentSlide);

  return (
    <section 
      className="relative h-[80vh] min-h-[500px] md:min-h-[600px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={content.image_url}
            alt={content.title || storeName}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className={cn(
            "absolute inset-0",
            isMobile 
              ? "bg-gradient-to-t from-background/90 via-background/50 to-transparent"
              : "bg-gradient-to-r from-background/80 via-background/40 to-transparent"
          )} />
        </motion.div>
      </AnimatePresence>

      <div className={cn(
        "relative container mx-auto px-4 h-full flex",
        isMobile ? "items-end pb-16" : "items-center"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className={cn(
              isMobile ? "max-w-full text-center" : "max-w-xl"
            )}
          >
            {content.badge && (
              <span className="text-primary font-medium tracking-widest uppercase text-sm">
                {content.badge}
              </span>
            )}
            <h1 className={cn(
              "font-display mt-4 mb-4 md:mb-6 leading-tight",
              isMobile ? "text-3xl" : "text-5xl md:text-7xl"
            )}>
              {content.title.split(' ').map((word, i, arr) => (
                <span key={i}>
                  {i === Math.floor(arr.length / 2) ? (
                    <span className="text-primary">{word}</span>
                  ) : (
                    word
                  )}
                  {i < arr.length - 1 && ' '}
                  {!isMobile && i === Math.floor(arr.length / 2) && <br />}
                </span>
              ))}
            </h1>
            {content.subtitle && (
              <p className={cn(
                "text-muted-foreground mb-6 md:mb-8",
                isMobile ? "text-sm max-w-xs mx-auto" : "text-lg max-w-md"
              )}>
                {content.subtitle}
              </p>
            )}
            <div className={cn(
              "flex gap-3 md:gap-4",
              isMobile && "justify-center flex-wrap"
            )}>
              {content.cta_text && content.cta_link && (
                <Button size={isMobile ? "default" : "lg"} asChild>
                  <Link to={content.cta_link}>
                    {content.cta_text} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {content.secondary_cta_text && content.secondary_cta_link && (
                <Button variant="outline" size={isMobile ? "default" : "lg"} asChild>
                  <Link to={content.secondary_cta_link}>
                    {content.secondary_cta_text}
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows - Hidden on mobile for cleaner UX */}
      {visibleSlides.length > 1 && !isMobile && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {visibleSlides.length > 1 && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 flex gap-2",
          isMobile ? "bottom-4" : "bottom-8"
        )}>
          {visibleSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 md:h-3 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "bg-primary w-6 md:w-8"
                  : "bg-foreground/30 hover:bg-foreground/50 w-2 md:w-3"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
