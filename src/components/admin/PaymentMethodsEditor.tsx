import { useState } from 'react';
import { CreditCard, Smartphone, Banknote, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSiteSettings, PaymentMethod } from '@/contexts/SiteSettingsContext';
import { useToast } from '@/hooks/use-toast';

const paymentTypeIcons: Record<string, React.ReactNode> = {
  cod: <Banknote className="h-5 w-5" />,
  bkash: <Smartphone className="h-5 w-5 text-pink-500" />,
  nagad: <Smartphone className="h-5 w-5 text-orange-500" />,
  card: <CreditCard className="h-5 w-5" />,
  bkash_gateway: <Smartphone className="h-5 w-5 text-pink-500" />,
  sslcommerz: <CreditCard className="h-5 w-5 text-green-600" />,
  other: <CreditCard className="h-5 w-5" />,
};

const paymentTypeLabels: Record<string, string> = {
  cod: 'Cash on Delivery',
  bkash: 'bKash (Manual)',
  nagad: 'Nagad (Manual)',
  card: 'Card Payment',
  bkash_gateway: 'bKash (Gateway)',
  sslcommerz: 'SSLCommerz',
  other: 'Other',
};

export default function PaymentMethodsEditor() {
  const { settings, updateSetting } = useSiteSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const paymentMethods: PaymentMethod[] = settings.payment_methods || [
    { id: 'cod', name: 'Cash on Delivery', type: 'cod', enabled: true },
    { id: 'bkash', name: 'bKash', type: 'bkash', enabled: true },
    { id: 'nagad', name: 'Nagad', type: 'nagad', enabled: true },
  ];

  const handleAddMethod = () => {
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: '',
      type: 'other',
      enabled: true,
    };
    updateMethods([...paymentMethods, newMethod]);
  };

  const handleRemoveMethod = (id: string) => {
    if (paymentMethods.length <= 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one payment method is required.",
        variant: "destructive",
      });
      return;
    }
    updateMethods(paymentMethods.filter(m => m.id !== id));
  };

  const handleUpdateMethod = (id: string, field: keyof PaymentMethod, value: string | boolean) => {
    updateMethods(paymentMethods.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const updateMethods = async (newMethods: PaymentMethod[]) => {
    setSaving(true);
    try {
      await updateSetting('payment_methods', newMethods);
      toast({
        title: "Saved",
        description: "Payment methods updated successfully.",
      });
    } catch (error) {
      console.error('Error saving payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to save payment methods.",
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
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Payment Methods</CardTitle>
        </div>
        <CardDescription>
          Configure available payment options for customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className="border rounded-lg p-4 space-y-4"
          >
            {/* Header Row */}
            <div className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              
              <div className="flex items-center gap-2 flex-1">
                {paymentTypeIcons[method.type]}
                <span className="font-medium">{method.name || paymentTypeLabels[method.type]}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={(checked) => handleUpdateMethod(method.id, 'enabled', checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {method.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveMethod(method.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Configuration Fields */}
            <div className="grid gap-4 md:grid-cols-2 pl-8">
              <div className="space-y-2">
                <Label htmlFor={`name-${method.id}`}>Display Name</Label>
                <Input
                  id={`name-${method.id}`}
                  value={method.name}
                  onChange={(e) => handleUpdateMethod(method.id, 'name', e.target.value)}
                  placeholder="e.g., Cash on Delivery"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`type-${method.id}`}>Type</Label>
                <Select
                  value={method.type}
                  onValueChange={(value) => handleUpdateMethod(method.id, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                    <SelectItem value="bkash">bKash (Manual)</SelectItem>
                    <SelectItem value="nagad">Nagad (Manual)</SelectItem>
                    <SelectItem value="bkash_gateway">bKash (Gateway)</SelectItem>
                    <SelectItem value="sslcommerz">SSLCommerz</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(method.type === 'bkash' || method.type === 'nagad') && (
                <div className="space-y-2">
                  <Label htmlFor={`account-${method.id}`}>Account Number</Label>
                  <Input
                    id={`account-${method.id}`}
                    value={method.accountNumber || ''}
                    onChange={(e) => handleUpdateMethod(method.id, 'accountNumber', e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`instructions-${method.id}`}>Payment Instructions (Optional)</Label>
                <Textarea
                  id={`instructions-${method.id}`}
                  value={method.instructions || ''}
                  onChange={(e) => handleUpdateMethod(method.id, 'instructions', e.target.value)}
                  placeholder="Instructions shown to customers at checkout..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddMethod}
          disabled={saving}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>

        <p className="text-xs text-muted-foreground">
          Only enabled payment methods will be shown to customers at checkout.
        </p>
      </CardContent>
    </Card>
  );
}
