import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronDown, ChevronUp, Smartphone, Monitor, Eye } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SingleImageUpload } from '@/components/admin/SingleImageUpload';
import { HeroSlide } from '@/contexts/SiteSettingsContext';
import { cn } from '@/lib/utils';

interface SortableHeroSlideProps {
  slide: HeroSlide;
  index: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (updates: Partial<HeroSlide>) => void;
  onRemove: () => void;
}

function SlidePreview({ slide, mode }: { slide: HeroSlide; mode: 'desktop' | 'mobile' }) {
  const isMobile = mode === 'mobile';
  
  const content = isMobile
    ? {
        image_url: slide.mobile_image_url || slide.image_url,
        title: slide.mobile_title || slide.title,
        subtitle: slide.mobile_subtitle || slide.subtitle,
        badge: slide.mobile_badge || slide.badge,
      }
    : {
        image_url: slide.image_url,
        title: slide.title,
        subtitle: slide.subtitle,
        badge: slide.badge,
      };

  if (isMobile && slide.hide_on_mobile) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 text-muted-foreground text-sm">
        Hidden on mobile
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Background Image */}
      {content.image_url ? (
        <img
          src={content.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
      )}
      
      {/* Overlay */}
      <div className={cn(
        "absolute inset-0",
        isMobile
          ? "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          : "bg-gradient-to-r from-black/70 via-black/30 to-transparent"
      )} />
      
      {/* Content */}
      <div className={cn(
        "relative h-full flex p-3",
        isMobile ? "items-end justify-center text-center pb-4" : "items-center"
      )}>
        <div className={cn(isMobile ? "max-w-full" : "max-w-[60%]")}>
          {content.badge && (
            <span className={cn(
              "text-primary font-medium uppercase tracking-wider",
              isMobile ? "text-[8px]" : "text-[10px]"
            )}>
              {content.badge}
            </span>
          )}
          <h3 className={cn(
            "font-display text-white leading-tight mt-1",
            isMobile ? "text-sm" : "text-lg"
          )}>
            {content.title || 'Slide Title'}
          </h3>
          {content.subtitle && (
            <p className={cn(
              "text-white/70 mt-1 line-clamp-2",
              isMobile ? "text-[8px]" : "text-[10px]"
            )}>
              {content.subtitle}
            </p>
          )}
          <div className={cn(
            "flex gap-1 mt-2",
            isMobile && "justify-center"
          )}>
            {slide.cta_text && (
              <div className={cn(
                "bg-primary text-primary-foreground rounded px-2 py-0.5",
                isMobile ? "text-[7px]" : "text-[8px]"
              )}>
                {slide.cta_text}
              </div>
            )}
            {slide.secondary_cta_text && (
              <div className={cn(
                "border border-white/50 text-white rounded px-2 py-0.5",
                isMobile ? "text-[7px]" : "text-[8px]"
              )}>
                {slide.secondary_cta_text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SortableHeroSlide({
  slide,
  index,
  isExpanded,
  onToggleExpanded,
  onUpdate,
  onRemove,
}: SortableHeroSlideProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasMobileOverrides = !!(slide.mobile_image_url || slide.mobile_title || slide.mobile_subtitle || slide.mobile_badge);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'border rounded-lg overflow-hidden bg-background',
          isDragging && 'opacity-50 shadow-lg z-50'
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {slide.title || `Slide ${index + 1}`}
                </p>
                {hasMobileOverrides && (
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                )}
                {slide.hide_on_mobile && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Hidden on mobile</span>
                )}
              </div>
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
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/30">
            {/* Preview Toggle */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showPreview}
                  onCheckedChange={setShowPreview}
                  id={`preview-toggle-${slide.id}`}
                />
                {showPreview && (
                  <ToggleGroup
                    type="single"
                    value={previewMode}
                    onValueChange={(value) => value && setPreviewMode(value as 'desktop' | 'mobile')}
                    className="bg-background rounded-lg p-0.5"
                  >
                    <ToggleGroupItem value="desktop" size="sm" className="h-7 px-2">
                      <Monitor className="h-3.5 w-3.5" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="mobile" size="sm" className="h-7 px-2">
                      <Smartphone className="h-3.5 w-3.5" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              </div>
            </div>

            {/* Preview Area */}
            {showPreview && (
              <div className="mb-4 flex justify-center">
                <div className={cn(
                  "border rounded-lg overflow-hidden shadow-sm transition-all duration-300",
                  previewMode === 'mobile'
                    ? "w-[180px] h-[320px]"
                    : "w-full max-w-[400px] h-[200px]"
                )}>
                  <SlidePreview slide={slide} mode={previewMode} />
                </div>
              </div>
            )}

            <Tabs defaultValue="desktop" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="desktop">Desktop</TabsTrigger>
                <TabsTrigger value="mobile" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="desktop" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <SingleImageUpload
                    image={slide.image_url || null}
                    onImageChange={(url) => onUpdate({ image_url: url || '' })}
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
                      onChange={(e) => onUpdate({ badge: e.target.value })}
                      placeholder="e.g., New Collection"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={slide.title}
                      onChange={(e) => onUpdate({ title: e.target.value })}
                      placeholder="Slide headline"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Textarea
                    value={slide.subtitle}
                    onChange={(e) => onUpdate({ subtitle: e.target.value })}
                    placeholder="Supporting text"
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Primary Button Text</Label>
                    <Input
                      value={slide.cta_text}
                      onChange={(e) => onUpdate({ cta_text: e.target.value })}
                      placeholder="e.g., Shop Now"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Button Link</Label>
                    <Input
                      value={slide.cta_link}
                      onChange={(e) => onUpdate({ cta_link: e.target.value })}
                      placeholder="/shop"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Secondary Button Text</Label>
                    <Input
                      value={slide.secondary_cta_text}
                      onChange={(e) => onUpdate({ secondary_cta_text: e.target.value })}
                      placeholder="e.g., Learn More"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Button Link</Label>
                    <Input
                      value={slide.secondary_cta_link}
                      onChange={(e) => onUpdate({ secondary_cta_link: e.target.value })}
                      placeholder="/about"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4 mt-0">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Hide on Mobile</Label>
                    <p className="text-xs text-muted-foreground">
                      Skip this slide on mobile devices
                    </p>
                  </div>
                  <Switch
                    checked={slide.hide_on_mobile || false}
                    onCheckedChange={(checked) => onUpdate({ hide_on_mobile: checked })}
                  />
                </div>

                {!slide.hide_on_mobile && (
                  <>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Mobile overrides are optional.</strong> Leave fields empty to use desktop content on mobile.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Mobile Background Image</Label>
                      <SingleImageUpload
                        image={slide.mobile_image_url || null}
                        onImageChange={(url) => onUpdate({ mobile_image_url: url || '' })}
                        folder="hero"
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: 750x1000 (portrait) for mobile
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Mobile Badge</Label>
                      <Input
                        value={slide.mobile_badge || ''}
                        onChange={(e) => onUpdate({ mobile_badge: e.target.value })}
                        placeholder={slide.badge || 'Leave empty to use desktop badge'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mobile Title</Label>
                      <Input
                        value={slide.mobile_title || ''}
                        onChange={(e) => onUpdate({ mobile_title: e.target.value })}
                        placeholder={slide.title || 'Leave empty to use desktop title'}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use shorter titles for mobile screens
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Mobile Subtitle</Label>
                      <Textarea
                        value={slide.mobile_subtitle || ''}
                        onChange={(e) => onUpdate({ mobile_subtitle: e.target.value })}
                        placeholder={slide.subtitle || 'Leave empty to use desktop subtitle'}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Consider using shorter text for mobile
                      </p>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
