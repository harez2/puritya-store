import { useState } from 'react';
import { Plus, Trash2, GripVertical, Truck, RefreshCw, Shield, Package, Clock, CreditCard, Heart, Star, Headphones, MapPin, Gift, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

interface FeaturesEditorProps {
  enabled: boolean;
  features: Feature[];
  onEnabledChange: (enabled: boolean) => void;
  onChange: (features: Feature[]) => void;
}

const ICON_OPTIONS = [
  { value: 'truck', label: 'Delivery Truck', icon: Truck },
  { value: 'refresh-cw', label: 'Refresh/Returns', icon: RefreshCw },
  { value: 'shield', label: 'Shield/Secure', icon: Shield },
  { value: 'package', label: 'Package', icon: Package },
  { value: 'clock', label: 'Clock/Time', icon: Clock },
  { value: 'credit-card', label: 'Credit Card', icon: CreditCard },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'headphones', label: 'Headphones/Support', icon: Headphones },
  { value: 'map-pin', label: 'Location', icon: MapPin },
  { value: 'gift', label: 'Gift', icon: Gift },
  { value: 'zap', label: 'Lightning/Fast', icon: Zap },
];

const getIconComponent = (iconName: string) => {
  const found = ICON_OPTIONS.find(opt => opt.value === iconName);
  return found?.icon || Truck;
};

export function FeaturesEditor({ enabled, features, onEnabledChange, onChange }: FeaturesEditorProps) {
  const handleFeatureChange = (index: number, field: keyof Feature, value: string) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleAddFeature = () => {
    onChange([...features, { icon: 'truck', title: 'New Feature', desc: 'Description here' }]);
  };

  const handleRemoveFeature = (index: number) => {
    const updated = features.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveFeature = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === features.length - 1)
    ) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...features];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Features Bar</CardTitle>
              <CardDescription>
                Display key selling points like free delivery, returns policy, and payment options below the hero section.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="features_enabled" className="text-sm text-muted-foreground">
                {enabled ? 'Visible' : 'Hidden'}
              </Label>
              <Switch
                id="features_enabled"
                checked={enabled}
                onCheckedChange={onEnabledChange}
              />
            </div>
          </div>
        </CardHeader>
        {enabled && (
          <CardContent className="space-y-4">
        {features.map((feature, index) => {
          const IconComponent = getIconComponent(feature.icon);
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex flex-col gap-1 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveFeature(index, 'up')}
                  disabled={index === 0}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={feature.icon}
                    onValueChange={(value) => handleFeatureChange(index, 'icon', value)}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{ICON_OPTIONS.find(o => o.value === feature.icon)?.label || feature.icon}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            <span>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={feature.title}
                    onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                    placeholder="e.g. Free Delivery"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={feature.desc}
                    onChange={(e) => handleFeatureChange(index, 'desc', e.target.value)}
                    placeholder="e.g. On orders over ৳5,000"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive mt-6"
                onClick={() => handleRemoveFeature(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddFeature}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>

        {/* Preview */}
        {features.length > 0 && (
          <div className="mt-6 p-4 border rounded-lg">
            <Label className="text-xs text-muted-foreground uppercase mb-3 block">Preview</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((feature, i) => {
                const IconComponent = getIconComponent(feature.icon);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <IconComponent className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
