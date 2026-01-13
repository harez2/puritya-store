import { useState } from 'react';
import { Plus, Trash2, GripVertical, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSiteSettings, ShippingOption } from '@/contexts/SiteSettingsContext';
import { useToast } from '@/hooks/use-toast';

export default function ShippingOptionsEditor() {
  const { settings, updateSetting } = useSiteSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<string[]>([]);

  const shippingOptions: ShippingOption[] = settings.shipping_options || [
    { id: '1', name: 'Inside Dhaka', price: 60, enabled: true },
    { id: '2', name: 'Outside Dhaka', price: 120, enabled: true },
  ];

  const toggleExpanded = (id: string) => {
    setExpandedOptions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddOption = () => {
    const newOption: ShippingOption = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      enabled: true,
    };
    updateOptions([...shippingOptions, newOption]);
    setExpandedOptions(prev => [...prev, newOption.id]);
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

  const handleUpdateOption = (id: string, field: keyof ShippingOption, value: string | number | boolean | undefined) => {
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
          Configure delivery zones, fees, and conditional discounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {shippingOptions.map((option) => (
          <Collapsible
            key={option.id}
            open={expandedOptions.includes(option.id)}
            onOpenChange={() => toggleExpanded(option.id)}
          >
            <div className="border rounded-lg overflow-hidden">
              {/* Header Row */}
              <div className="flex items-center gap-3 p-4 bg-secondary/50">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 grid gap-3 md:grid-cols-3 items-center">
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
                    <Label htmlFor={`price-${option.id}`} className="text-xs">Base Fee (৳)</Label>
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
                    
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                        {expandedOptions.includes(option.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
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

              {/* Expanded Conditions */}
              <CollapsibleContent>
                <div className="p-4 border-t bg-background space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Shipping Conditions</p>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Free Shipping Threshold */}
                    <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <Label htmlFor={`free-${option.id}`} className="text-sm font-medium text-green-700 dark:text-green-400">
                        Free Shipping Threshold (৳)
                      </Label>
                      <Input
                        id={`free-${option.id}`}
                        type="number"
                        min="0"
                        value={option.freeShippingThreshold || ''}
                        onChange={(e) => handleUpdateOption(
                          option.id, 
                          'freeShippingThreshold', 
                          e.target.value ? Number(e.target.value) : undefined
                        )}
                        placeholder="e.g., 5000"
                        className="bg-white dark:bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Free shipping when order total ≥ this amount
                      </p>
                    </div>

                    {/* Discount Section */}
                    <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <Label className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Shipping Discount
                      </Label>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`discount-threshold-${option.id}`} className="text-xs">
                          Minimum Order (৳)
                        </Label>
                        <Input
                          id={`discount-threshold-${option.id}`}
                          type="number"
                          min="0"
                          value={option.discountThreshold || ''}
                          onChange={(e) => handleUpdateOption(
                            option.id, 
                            'discountThreshold', 
                            e.target.value ? Number(e.target.value) : undefined
                          )}
                          placeholder="e.g., 2000"
                          className="bg-white dark:bg-background"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`discount-amount-${option.id}`} className="text-xs">
                          Discount Amount (৳)
                        </Label>
                        <Input
                          id={`discount-amount-${option.id}`}
                          type="number"
                          min="0"
                          value={option.discountAmount || ''}
                          onChange={(e) => handleUpdateOption(
                            option.id, 
                            'discountAmount', 
                            e.target.value ? Number(e.target.value) : undefined
                          )}
                          placeholder="e.g., 30"
                          className="bg-white dark:bg-background"
                        />
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Reduce shipping fee by this amount when order ≥ threshold
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  {(option.freeShippingThreshold || option.discountThreshold) && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Base shipping: ৳{option.price}</li>
                        {option.discountThreshold && option.discountAmount && (
                          <li>• Orders ≥ ৳{option.discountThreshold}: ৳{Math.max(0, option.price - option.discountAmount)} shipping</li>
                        )}
                        {option.freeShippingThreshold && (
                          <li className="text-green-600 dark:text-green-400">• Orders ≥ ৳{option.freeShippingThreshold}: FREE shipping</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
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
          Expand each zone to set free shipping thresholds and discounts.
        </p>
      </CardContent>
    </Card>
  );
}
