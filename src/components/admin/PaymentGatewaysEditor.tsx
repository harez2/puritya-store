import { useState } from 'react';
import { CreditCard, Shield, Eye, EyeOff, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSiteSettings, PaymentGatewayConfig } from '@/contexts/SiteSettingsContext';
import { useToast } from '@/hooks/use-toast';

export default function PaymentGatewaysEditor() {
  const { settings, updateSetting } = useSiteSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showBkashSecret, setShowBkashSecret] = useState(false);
  const [showSslPassword, setShowSslPassword] = useState(false);
  const [showUddoktaKey, setShowUddoktaKey] = useState(false);

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
          <CardTitle>Payment Gateways</CardTitle>
        </div>
        <CardDescription>
          Configure online payment gateways for automatic payment processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                    Get your credentials from{' '}
                    <a 
                      href="https://docs.uddoktapay.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      UddoktaPay Documentation <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">How Payment Gateways Work</p>
            <p className="text-muted-foreground mt-1">
              When a customer selects a gateway payment method at checkout, they will be redirected 
              to the payment provider's secure page to complete the transaction. After successful 
              payment, they will be redirected back to your store.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
