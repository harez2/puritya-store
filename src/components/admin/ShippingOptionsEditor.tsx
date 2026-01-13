import { useState } from 'react';
import { Plus, Trash2, GripVertical, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSiteSettings, ShippingOption } from '@/contexts/SiteSettingsContext';
import { useToast } from '@/hooks/use-toast';

export default function ShippingOptionsEditor() {
  const { settings, updateSetting } = useSiteSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const shippingOptions: ShippingOption[] = settings.shipping_options || [
    { id: '1', name: 'Inside Dhaka', price: 60, enabled: true },
    { id: '2', name: 'Outside Dhaka', price: 120, enabled: true },
  ];

  const handleAddOption = () => {
    const newOption: ShippingOption = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      enabled: true,
    };
    updateOptions([...shippingOptions, newOption]);
  };

  const handleRemoveOption = (id: string) => {
    if (shippingOptions.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one shipping option is required.",
        variant: "destructive",
      });
      return;
    }
    updateOptions(shippingOptions.filter(opt => opt.id !== id));
  };

  const handleUpdateOption = (id: string, field: keyof ShippingOption, value: string | number | boolean) => {
    updateOptions(shippingOptions.map(opt => 
      opt.id === id ? { ...opt, [field]: value } : opt
    ));
  };

  const updateOptions = async (newOptions: ShippingOption[]) => {
    setSaving(true);
    try {
      await updateSetting('shipping_options', newOptions);
      toast({
        title: "Saved",
        description: "Shipping options updated successfully.",
      });
    } catch (error) {
      console.error('Error saving shipping options:', error);
      toast({
        title: "Error",
        description: "Failed to save shipping options.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <CardTitle>Shipping Options</CardTitle>
        </div>
        <CardDescription>
          Configure delivery zones and shipping fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {shippingOptions.map((option, index) => (
          <div
            key={option.id}
            className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
            
            <div className="flex-1 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor={`name-${option.id}`} className="text-xs">Zone Name</Label>
                <Input
                  id={`name-${option.id}`}
                  value={option.name}
                  onChange={(e) => handleUpdateOption(option.id, 'name', e.target.value)}
                  placeholder="e.g., Inside Dhaka"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor={`price-${option.id}`} className="text-xs">Shipping Fee (৳)</Label>
                <Input
                  id={`price-${option.id}`}
                  type="number"
                  min="0"
                  value={option.price}
                  onChange={(e) => handleUpdateOption(option.id, 'price', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              
              <div className="flex items-center justify-between md:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={option.enabled}
                    onCheckedChange={(checked) => handleUpdateOption(option.id, 'enabled', checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {option.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveOption(option.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddOption}
          disabled={saving}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Shipping Zone
        </Button>

        <p className="text-xs text-muted-foreground">
          Shipping options will appear in the checkout form for customers to select.
        </p>
      </CardContent>
    </Card>
  );
}
