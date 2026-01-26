import { useState } from 'react';
import { CreditCard, Smartphone, Banknote, Plus, Trash2, GripVertical, Shield, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSiteSettings, PaymentMethod, PaymentGatewayConfig } from '@/contexts/SiteSettingsContext';
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

export default function PaymentSettingsEditor() {
  const { settings, updateSetting } = useSiteSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showBkashSecret, setShowBkashSecret] = useState(false);
  const [showSslPassword, setShowSslPassword] = useState(false);
  const [showUddoktaKey, setShowUddoktaKey] = useState(false);

  // Payment Methods
  const paymentMethods: PaymentMethod[] = settings.payment_methods || [
    { id: 'cod', name: 'Cash on Delivery', type: 'cod', enabled: true },
    { id: 'bkash', name: 'bKash', type: 'bkash', enabled: true },
    { id: 'nagad', name: 'Nagad', type: 'nagad', enabled: true },
  ];

  // Payment Gateways
  const gateways: PaymentGatewayConfig = settings.payment_gateways || {
    bkash_enabled: false,
    bkash_sandbox: true,
    bkash_app_key: '',
    bkash_app_secret: '',
    bkash_is_default: false,
    sslcommerz_enabled: false,
    sslcommerz_sandbox: true,
    sslcommerz_store_id: '',
    sslcommerz_store_password: '',
    sslcommerz_is_default: false,
    uddoktapay_enabled: false,
    uddoktapay_sandbox: true,
    uddoktapay_base_url: '',
    uddoktapay_api_key: '',
    uddoktapay_is_default: false,
  };

  // Payment Methods handlers
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

  // Payment Gateways handlers
  const handleUpdateGateway = async (key: keyof PaymentGatewayConfig, value: boolean | string) => {
    setSaving(true);
    try {
      let updatedGateways = { ...gateways, [key]: value };

      // Handle default gateway logic - only one can be default
      if (key === 'bkash_is_default' && value === true) {
        updatedGateways.sslcommerz_is_default = false;
        updatedGateways.uddoktapay_is_default = false;
      } else if (key === 'sslcommerz_is_default' && value === true) {
        updatedGateways.bkash_is_default = false;
        updatedGateways.uddoktapay_is_default = false;
      } else if (key === 'uddoktapay_is_default' && value === true) {
        updatedGateways.bkash_is_default = false;
        updatedGateways.sslcommerz_is_default = false;
      }

      await updateSetting('payment_gateways', updatedGateways);
      toast({
        title: "Saved",
        description: "Payment gateway settings updated.",
      });
    } catch (error) {
      console.error('Error updating gateway:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
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
          <CardTitle>Payment Settings</CardTitle>
        </div>
        <CardDescription>
          Configure payment methods and online payment gateways
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="methods" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="gateways">Payment Gateways</TabsTrigger>
          </TabsList>

          {/* Payment Methods Tab */}
          <TabsContent value="methods" className="space-y-4">
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
          </TabsContent>

          {/* Payment Gateways Tab */}
          <TabsContent value="gateways" className="space-y-6">
            {/* bKash Gateway */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <span className="text-pink-600 font-bold text-sm">bK</span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      bKash Payment Gateway
                      {gateways.bkash_is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">Accept payments via bKash</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={gateways.bkash_enabled}
                      onCheckedChange={(checked) => handleUpdateGateway('bkash_enabled', checked)}
                      disabled={saving}
                    />
                    <span className="text-sm text-muted-foreground">
                      {gateways.bkash_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {gateways.bkash_enabled && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bkash_app_key">App Key</Label>
                      <Input
                        id="bkash_app_key"
                        value={gateways.bkash_app_key}
                        onChange={(e) => handleUpdateGateway('bkash_app_key', e.target.value)}
                        placeholder="Enter your bKash App Key"
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bkash_app_secret">App Secret</Label>
                      <div className="relative">
                        <Input
                          id="bkash_app_secret"
                          type={showBkashSecret ? 'text' : 'password'}
                          value={gateways.bkash_app_secret}
                          onChange={(e) => handleUpdateGateway('bkash_app_secret', e.target.value)}
                          placeholder="Enter your bKash App Secret"
                          disabled={saving}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowBkashSecret(!showBkashSecret)}
                        >
                          {showBkashSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gateways.bkash_sandbox}
                          onCheckedChange={(checked) => handleUpdateGateway('bkash_sandbox', checked)}
                          disabled={saving}
                        />
                        <Label className="text-sm">Sandbox Mode</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gateways.bkash_is_default}
                          onCheckedChange={(checked) => handleUpdateGateway('bkash_is_default', checked)}
                          disabled={saving || !gateways.bkash_app_key || !gateways.bkash_app_secret}
                        />
                        <Label className="text-sm">Set as Default</Label>
                      </div>
                    </div>
                    {gateways.bkash_sandbox && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                        Test Mode
                      </Badge>
                    )}
                  </div>

                  {(!gateways.bkash_app_key || !gateways.bkash_app_secret) && (
                    <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Get your credentials from{' '}
                        <a 
                          href="https://developer.bka.sh/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          bKash Developer Portal <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SSLCommerz Gateway */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">SSL</span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      SSLCommerz Payment Gateway
                      {gateways.sslcommerz_is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">Accept Cards, bKash, Nagad & more</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={gateways.sslcommerz_enabled}
                      onCheckedChange={(checked) => handleUpdateGateway('sslcommerz_enabled', checked)}
                      disabled={saving}
                    />
                    <span className="text-sm text-muted-foreground">
                      {gateways.sslcommerz_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {gateways.sslcommerz_enabled && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sslcommerz_store_id">Store ID</Label>
                      <Input
                        id="sslcommerz_store_id"
                        value={gateways.sslcommerz_store_id}
                        onChange={(e) => handleUpdateGateway('sslcommerz_store_id', e.target.value)}
                        placeholder="Enter your Store ID"
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sslcommerz_store_password">Store Password</Label>
                      <div className="relative">
                        <Input
                          id="sslcommerz_store_password"
                          type={showSslPassword ? 'text' : 'password'}
                          value={gateways.sslcommerz_store_password}
                          onChange={(e) => handleUpdateGateway('sslcommerz_store_password', e.target.value)}
                          placeholder="Enter your Store Password"
                          disabled={saving}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowSslPassword(!showSslPassword)}
                        >
                          {showSslPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gateways.sslcommerz_sandbox}
                          onCheckedChange={(checked) => handleUpdateGateway('sslcommerz_sandbox', checked)}
                          disabled={saving}
                        />
                        <Label className="text-sm">Sandbox Mode</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gateways.sslcommerz_is_default}
                          onCheckedChange={(checked) => handleUpdateGateway('sslcommerz_is_default', checked)}
                          disabled={saving || !gateways.sslcommerz_store_id || !gateways.sslcommerz_store_password}
                        />
                        <Label className="text-sm">Set as Default</Label>
                      </div>
                    </div>
                    {gateways.sslcommerz_sandbox && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                        Test Mode
                      </Badge>
                    )}
                  </div>

                  {(!gateways.sslcommerz_store_id || !gateways.sslcommerz_store_password) && (
                    <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Get your credentials from{' '}
                        <a 
                          href="https://developer.sslcommerz.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          SSLCommerz Developer Portal <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* UddoktaPay Gateway */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">UP</span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      UddoktaPay Gateway
                      {gateways.uddoktapay_is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">Accept bKash, Nagad, Rocket & more</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={gateways.uddoktapay_enabled}
                      onCheckedChange={(checked) => handleUpdateGateway('uddoktapay_enabled', checked)}
                      disabled={saving}
                    />
                    <span className="text-sm text-muted-foreground">
                      {gateways.uddoktapay_enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {gateways.uddoktapay_enabled && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="uddoktapay_base_url">Base URL</Label>
                      <Input
                        id="uddoktapay_base_url"
                        value={gateways.uddoktapay_base_url}
                        onChange={(e) => handleUpdateGateway('uddoktapay_base_url', e.target.value)}
                        placeholder="https://pay.your-domain.com"
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your UddoktaPay installation URL (e.g., https://sandbox.uddoktapay.com)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="uddoktapay_api_key">API Key</Label>
                      <div className="relative">
                        <Input
                          id="uddoktapay_api_key"
                          type={showUddoktaKey ? 'text' : 'password'}
                          value={gateways.uddoktapay_api_key}
                          onChange={(e) => handleUpdateGateway('uddoktapay_api_key', e.target.value)}
                          placeholder="Enter your API Key"
                          disabled={saving}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowUddoktaKey(!showUddoktaKey)}
                        >
                          {showUddoktaKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gateways.uddoktapay_sandbox}
                          onCheckedChange={(checked) => handleUpdateGateway('uddoktapay_sandbox', checked)}
                          disabled={saving}
                        />
                        <Label className="text-sm">Sandbox Mode</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={gateways.uddoktapay_is_default}
                          onCheckedChange={(checked) => handleUpdateGateway('uddoktapay_is_default', checked)}
                          disabled={saving || !gateways.uddoktapay_base_url || !gateways.uddoktapay_api_key}
                        />
                        <Label className="text-sm">Set as Default</Label>
                      </div>
                    </div>
                    {gateways.uddoktapay_sandbox && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                        Test Mode
                      </Badge>
                    )}
                  </div>

                  {(!gateways.uddoktapay_base_url || !gateways.uddoktapay_api_key) && (
                    <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Get your credentials from your UddoktaPay dashboard or{' '}
                        <a 
                          href="https://uddoktapay.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          UddoktaPay Website <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Configure online payment gateways for automatic payment processing. Only one gateway can be set as default.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
