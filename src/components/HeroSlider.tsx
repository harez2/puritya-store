import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSlide } from '@/contexts/SiteSettingsContext';
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

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Autoplay effect
  useEffect(() => {
    if (!autoplay || isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoplayDelay * 1000);

    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, isPaused, goToNext, slides.length]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <section 
      className="relative h-[80vh] min-h-[600px] overflow-hidden"
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
            src={currentSlide.image_url}
            alt={currentSlide.title || storeName}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative container mx-auto px-4 h-full flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl"
          >
            {currentSlide.badge && (
              <span className="text-primary font-medium tracking-widest uppercase text-sm">
                {currentSlide.badge}
              </span>
            )}
            <h1 className="font-display text-5xl md:text-7xl mt-4 mb-6 leading-tight">
              {currentSlide.title.split(' ').map((word, i, arr) => (
                <span key={i}>
                  {i === Math.floor(arr.length / 2) ? (
                    <span className="text-primary">{word}</span>
                  ) : (
                    word
                  )}
                  {i < arr.length - 1 && ' '}
                  {i === Math.floor(arr.length / 2) && <br />}
                </span>
              ))}
            </h1>
            {currentSlide.subtitle && (
              <p className="text-lg text-muted-foreground mb-8 max-w-md">
                {currentSlide.subtitle}
              </p>
            )}
            <div className="flex gap-4">
              {currentSlide.cta_text && currentSlide.cta_link && (
                <Button size="lg" asChild>
                  <Link to={currentSlide.cta_link}>
                    {currentSlide.cta_text} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {currentSlide.secondary_cta_text && currentSlide.secondary_cta_link && (
                <Button variant="outline" size="lg" asChild>
                  <Link to={currentSlide.secondary_cta_link}>
                    {currentSlide.secondary_cta_text}
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
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
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "bg-primary w-8"
                  : "bg-foreground/30 hover:bg-foreground/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
