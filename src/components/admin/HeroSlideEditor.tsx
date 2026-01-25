import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';
import { HeroSlide, HeroSliderSettings } from '@/contexts/SiteSettingsContext';
import { cn } from '@/lib/utils';

interface HeroSlideEditorProps {
  settings: HeroSliderSettings;
  onChange: (settings: HeroSliderSettings) => void;
}

export function HeroSlideEditor({ settings, onChange }: HeroSlideEditorProps) {
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());

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

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= settings.slides.length) return;

    const newSlides = [...settings.slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    onChange({ ...settings, slides: newSlides });
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
              <div className="space-y-3">
                {settings.slides.map((slide, index) => (
                  <Collapsible
                    key={slide.id}
                    open={expandedSlides.has(slide.id)}
                    onOpenChange={() => toggleSlideExpanded(slide.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {slide.title || `Slide ${index + 1}`}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {slide.badge || 'No badge'}
                            </p>
                          </div>
                          {slide.image_url && (
                            <img
                              src={slide.image_url}
                              alt=""
                              className="h-10 w-16 object-cover rounded"
                            />
                          )}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSlide(index, 'up');
                              }}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSlide(index, 'down');
                              }}
                              disabled={index === settings.slides.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSlide(slide.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-4 bg-muted/30">
                          <div className="space-y-2">
                            <Label>Background Image</Label>
                            <SingleImageUpload
                              image={slide.image_url || null}
                              onImageChange={(url) =>
                                updateSlide(slide.id, { image_url: url || '' })
                              }
                              folder="hero"
                            />
                            <p className="text-xs text-muted-foreground">
                              Recommended: 1920x1080 or larger
                            </p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Badge Text</Label>
                              <Input
                                value={slide.badge}
                                onChange={(e) =>
                                  updateSlide(slide.id, { badge: e.target.value })
                                }
                                placeholder="e.g., New Collection"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={slide.title}
                                onChange={(e) =>
                                  updateSlide(slide.id, { title: e.target.value })
                                }
                                placeholder="Slide headline"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Subtitle</Label>
                            <Textarea
                              value={slide.subtitle}
                              onChange={(e) =>
                                updateSlide(slide.id, { subtitle: e.target.value })
                              }
                              placeholder="Supporting text"
                              rows={2}
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Primary Button Text</Label>
                              <Input
                                value={slide.cta_text}
                                onChange={(e) =>
                                  updateSlide(slide.id, { cta_text: e.target.value })
                                }
                                placeholder="e.g., Shop Now"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Primary Button Link</Label>
                              <Input
                                value={slide.cta_link}
                                onChange={(e) =>
                                  updateSlide(slide.id, { cta_link: e.target.value })
                                }
                                placeholder="/shop"
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Secondary Button Text</Label>
                              <Input
                                value={slide.secondary_cta_text}
                                onChange={(e) =>
                                  updateSlide(slide.id, {
                                    secondary_cta_text: e.target.value,
                                  })
                                }
                                placeholder="e.g., Learn More"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Secondary Button Link</Label>
                              <Input
                                value={slide.secondary_cta_link}
                                onChange={(e) =>
                                  updateSlide(slide.id, {
                                    secondary_cta_link: e.target.value,
                                  })
                                }
                                placeholder="/about"
                              />
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
