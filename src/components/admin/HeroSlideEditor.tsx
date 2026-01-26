import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { HeroSlide, HeroSliderSettings } from '@/contexts/SiteSettingsContext';
import { SortableHeroSlide } from './SortableHeroSlide';

interface HeroSlideEditorProps {
  settings: HeroSliderSettings;
  onChange: (settings: HeroSliderSettings) => void;
}

export function HeroSlideEditor({ settings, onChange }: HeroSlideEditorProps) {
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSlideExpanded = (id: string) => {
    setExpandedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addSlide = () => {
    const newSlide: HeroSlide = {
      id: crypto.randomUUID(),
      image_url: '',
      badge: '',
      title: 'New Slide Title',
      subtitle: '',
      cta_text: 'Shop Now',
      cta_link: '/shop',
      secondary_cta_text: '',
      secondary_cta_link: '',
    };
    onChange({
      ...settings,
      slides: [...settings.slides, newSlide],
    });
    setExpandedSlides((prev) => new Set(prev).add(newSlide.id));
  };

  const updateSlide = (id: string, updates: Partial<HeroSlide>) => {
    onChange({
      ...settings,
      slides: settings.slides.map((slide) =>
        slide.id === id ? { ...slide, ...updates } : slide
      ),
    });
  };

  const removeSlide = (id: string) => {
    onChange({
      ...settings,
      slides: settings.slides.filter((slide) => slide.id !== id),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = settings.slides.findIndex((slide) => slide.id === active.id);
      const newIndex = settings.slides.findIndex((slide) => slide.id === over.id);

      onChange({
        ...settings,
        slides: arrayMove(settings.slides, oldIndex, newIndex),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Slider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Slider Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Hero Slider</Label>
              <p className="text-sm text-muted-foreground">
                Use multiple slides instead of a single hero image
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => onChange({ ...settings, enabled })}
            />
          </div>

          {settings.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autoplay</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically cycle through slides
                  </p>
                </div>
                <Switch
                  checked={settings.autoplay}
                  onCheckedChange={(autoplay) => onChange({ ...settings, autoplay })}
                />
              </div>

              {settings.autoplay && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Slide Duration</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.autoplay_delay} seconds
                    </span>
                  </div>
                  <Slider
                    value={[settings.autoplay_delay]}
                    min={2}
                    max={15}
                    step={1}
                    onValueChange={([value]) =>
                      onChange({ ...settings, autoplay_delay: value })
                    }
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Slides Management */}
      {settings.enabled && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Slides ({settings.slides.length})</CardTitle>
            <Button onClick={addSlide} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Slide
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.slides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No slides yet. Add your first slide to get started.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={settings.slides.map((slide) => slide.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {settings.slides.map((slide, index) => (
                      <SortableHeroSlide
                        key={slide.id}
                        slide={slide}
                        index={index}
                        isExpanded={expandedSlides.has(slide.id)}
                        onToggleExpanded={() => toggleSlideExpanded(slide.id)}
                        onUpdate={(updates) => updateSlide(slide.id, updates)}
                        onRemove={() => removeSlide(slide.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
