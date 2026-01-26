import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';

interface LandingPageSection {
  id: string;
  type: string;
  content: Record<string, any>;
}

interface Props {
  section: LandingPageSection;
  onUpdate: (content: Record<string, any>) => void;
}

export function LandingPageSectionEditor({ section, onUpdate }: Props) {
  const { type, content } = section;

  const updateField = (field: string, value: any) => {
    onUpdate({ ...content, [field]: value });
  };

  switch (type) {
    case 'hero':
      return <HeroEditor content={content} onUpdate={onUpdate} />;
    case 'text':
      return <TextEditor content={content} onUpdate={onUpdate} />;
    case 'features':
      return <FeaturesEditor content={content} onUpdate={onUpdate} />;
    case 'testimonials':
      return <TestimonialsEditor content={content} onUpdate={onUpdate} />;
    case 'cta':
      return <CTAEditor content={content} onUpdate={onUpdate} />;
    case 'products':
      return <ProductsEditor content={content} onUpdate={onUpdate} />;
    case 'image':
      return <ImageEditor content={content} onUpdate={onUpdate} />;
    default:
      return <p className="text-muted-foreground">Unknown section type</p>;
  }
}

function HeroEditor({ content, onUpdate }: { content: any; onUpdate: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Headline</Label>
        <Input
          value={content.headline || ''}
          onChange={(e) => onUpdate({ ...content, headline: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Subheadline</Label>
        <Textarea
          value={content.subheadline || ''}
          onChange={(e) => onUpdate({ ...content, subheadline: e.target.value })}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={content.ctaText || ''}
            onChange={(e) => onUpdate({ ...content, ctaText: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Button Link</Label>
          <Input
            value={content.ctaLink || ''}
            onChange={(e) => onUpdate({ ...content, ctaLink: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Background Image URL</Label>
        <Input
          value={content.backgroundImage || ''}
          onChange={(e) => onUpdate({ ...content, backgroundImage: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Background Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.backgroundColor || '#000000'}
              onChange={(e) => onUpdate({ ...content, backgroundColor: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={content.backgroundColor || '#000000'}
              onChange={(e) => onUpdate({ ...content, backgroundColor: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Text Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.textColor || '#ffffff'}
              onChange={(e) => onUpdate({ ...content, textColor: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={content.textColor || '#ffffff'}
              onChange={(e) => onUpdate({ ...content, textColor: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TextEditor({ content, onUpdate }: { content: any; onUpdate: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={content.content || ''}
          onChange={(e) => onUpdate({ ...content, content: e.target.value })}
          rows={6}
          placeholder="Enter your text content..."
        />
      </div>
      <div className="space-y-2">
        <Label>Text Alignment</Label>
        <Select
          value={content.alignment || 'center'}
          onValueChange={(value) => onUpdate({ ...content, alignment: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FeaturesEditor({ content, onUpdate }: { content: any; onUpdate: (c: any) => void }) {
  const features = content.features || [];

  const addFeature = () => {
    onUpdate({
      ...content,
      features: [...features, { icon: 'star', title: 'New Feature', description: 'Description' }],
    });
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate({ ...content, features: updated });
  };

  const removeFeature = (index: number) => {
    onUpdate({ ...content, features: features.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Headline</Label>
        <Input
          value={content.headline || ''}
          onChange={(e) => onUpdate({ ...content, headline: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        <Label>Features</Label>
        {features.map((feature: any, index: number) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Feature {index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => removeFeature(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={feature.title}
              onChange={(e) => updateFeature(index, 'title', e.target.value)}
              placeholder="Title"
            />
            <Input
              value={feature.description}
              onChange={(e) => updateFeature(index, 'description', e.target.value)}
              placeholder="Description"
            />
            <Select
              value={feature.icon || 'star'}
              onValueChange={(value) => updateFeature(index, 'icon', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="star">Star</SelectItem>
                <SelectItem value="shield">Shield</SelectItem>
                <SelectItem value="zap">Zap</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="heart">Heart</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addFeature} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </div>
    </div>
  );
}

function TestimonialsEditor({ content, onUpdate }: { content: any; onUpdate: (c: any) => void }) {
  const testimonials = content.testimonials || [];

  const addTestimonial = () => {
    onUpdate({
      ...content,
      testimonials: [...testimonials, { name: 'Customer Name', role: 'Customer', content: 'Great product!', avatar: '' }],
    });
  };

  const updateTestimonial = (index: number, field: string, value: string) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate({ ...content, testimonials: updated });
  };

  const removeTestimonial = (index: number) => {
    onUpdate({ ...content, testimonials: testimonials.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Headline</Label>
        <Input
          value={content.headline || ''}
          onChange={(e) => onUpdate({ ...content, headline: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        <Label>Testimonials</Label>
        {testimonials.map((testimonial: any, index: number) => (
          <div key={index} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Testimonial {index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => removeTestimonial(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={testimonial.name}
              onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
              placeholder="Name"
            />
            <Input
              value={testimonial.role}
              onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
              placeholder="Role/Title"
            />
            <Textarea
              value={testimonial.content}
              onChange={(e) => updateTestimonial(index, 'content', e.target.value)}
              placeholder="Testimonial content"
              rows={2}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addTestimonial} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Testimonial
        </Button>
      </div>
    </div>
  );
}

function CTAEditor({ content, onUpdate }: { content: any; onUpdate: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Headline</Label>
        <Input
          value={content.headline || ''}
          onChange={(e) => onUpdate({ ...content, headline: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Subheadline</Label>
        <Textarea
          value={content.subheadline || ''}
          onChange={(e) => onUpdate({ ...content, subheadline: e.target.value })}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Button Text</Label>
          <Input
            value={content.ctaText || ''}
            onChange={(e) => onUpdate({ ...content, ctaText: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Button Link</Label>
          <Input
            value={content.ctaLink || ''}
            onChange={(e) => onUpdate({ ...content, ctaLink: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Background</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.backgroundColor || '#3b82f6'}
              onChange={(e) => onUpdate({ ...content, backgroundColor: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={content.backgroundColor || '#3b82f6'}
              onChange={(e) => onUpdate({ ...content, backgroundColor: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Text Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.textColor || '#ffffff'}
              onChange={(e) => onUpdate({ ...content, textColor: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={content.textColor || '#ffffff'}
              onChange={(e) => onUpdate({ ...content, textColor: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsEditor({ content, onUpdate }: { content: any; onUpdate: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Headline</Label>
        <Input
          value={content.headline || ''}
          onChange={(e) => onUpdate({ ...content, headline: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Product IDs (comma separated)</Label>
        <Textarea
          value={(content.productIds || []).join(', ')}
          onChange={(e) => onUpdate({ 
            ...content, 
            productIds: e.target.value.split(',').map((id: string) => id.trim()).filter(Boolean) 
          })}
          placeholder="product-uuid-1, product-uuid-2"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to show featured products automatically
        </p>
      </div>
      <div className="space-y-2">
        <Label>Columns</Label>
        <Select
          value={String(content.columns || 4)}
          onValueChange={(value) => onUpdate({ ...content, columns: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 Columns</SelectItem>
            <SelectItem value="3">3 Columns</SelectItem>
            <SelectItem value="4">4 Columns</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label>Show Prices</Label>
        <Switch
          checked={content.showPrices ?? true}
          onCheckedChange={(checked) => onUpdate({ ...content, showPrices: checked })}
        />
      </div>
    </div>
  );
}

function ImageEditor({ content, onUpdate }: { content: any; onUpdate: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input
          value={content.imageUrl || ''}
          onChange={(e) => onUpdate({ ...content, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <Label>Alt Text</Label>
        <Input
          value={content.alt || ''}
          onChange={(e) => onUpdate({ ...content, alt: e.target.value })}
          placeholder="Describe the image"
        />
      </div>
      <div className="space-y-2">
        <Label>Caption (optional)</Label>
        <Input
          value={content.caption || ''}
          onChange={(e) => onUpdate({ ...content, caption: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Full Width</Label>
        <Switch
          checked={content.fullWidth ?? true}
          onCheckedChange={(checked) => onUpdate({ ...content, fullWidth: checked })}
        />
      </div>
    </div>
  );
}
