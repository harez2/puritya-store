import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Store, Shield, Package, MapPin, Ban, Users, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ShippingOptionsEditor from '@/components/admin/ShippingOptionsEditor';
import PaymentSettingsEditor from '@/components/admin/PaymentSettingsEditor';
import SmsSettingsEditor from '@/components/admin/SmsSettingsEditor';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Link } from 'react-router-dom';

interface ProductSettings {
  sizesEnabled: boolean;
  colorsEnabled: boolean;
}

const defaultProductSettings: ProductSettings = {
  sizesEnabled: true,
  colorsEnabled: true,
};

export default function AdminSettings() {
  const { settings, updateSetting } = useSiteSettings();
  const [productSettings, setProductSettings] = useState<ProductSettings>(defaultProductSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductSettings();
  }, []);

  const fetchProductSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'product_options')
        .eq('category', 'products')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        setProductSettings({ ...defaultProductSettings, ...(data.value as unknown as ProductSettings) });
      }
    } catch (error) {
      console.error('Error fetching product settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProductSetting = async (key: keyof ProductSettings, value: boolean) => {
    const updatedSettings = { ...productSettings, [key]: value };
    setProductSettings(updatedSettings);

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'product_options',
          category: 'products',
          value: updatedSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
      toast.success('Product settings updated');
    } catch (error) {
      console.error('Error updating product settings:', error);
      toast.error('Failed to update settings');
      setProductSettings(productSettings);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your store settings</p>
        </div>

        <div className="grid gap-6">
          {/* Store Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <CardTitle>Store Information</CardTitle>
              </div>
              <CardDescription>
                Basic information about your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input id="storeName" defaultValue="Puritya" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Contact Email</Label>
                  <Input id="storeEmail" type="email" defaultValue="contact@puritya.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storePhone">Phone Number</Label>
                  <Input id="storePhone" defaultValue="+880 1234-567890" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" defaultValue="BDT" disabled />
                </div>
              </div>
              <Separator />
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Product Options */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Product Options</CardTitle>
              </div>
              <CardDescription>
                Configure which product options are available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sizesEnabled">Product Sizes</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow products to have size variants (S, M, L, XL, etc.)
                  </p>
                </div>
                <Switch
                  id="sizesEnabled"
                  checked={productSettings.sizesEnabled}
                  onCheckedChange={(checked) => updateProductSetting('sizesEnabled', checked)}
                  disabled={loading}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="colorsEnabled">Product Colors</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow products to have color variants
                  </p>
                </div>
                <Switch
                  id="colorsEnabled"
                  checked={productSettings.colorsEnabled}
                  onCheckedChange={(checked) => updateProductSetting('colorsEnabled', checked)}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Shipping Options */}
          <ShippingOptionsEditor />

          {/* Payment Settings (Methods + Gateways) */}
          <PaymentSettingsEditor />

          {/* SMS Notifications */}
          <SmsSettingsEditor />

          {/* Order Tracking Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Order Tracking</CardTitle>
              </div>
              <CardDescription>
                Allow customers to track their orders using phone number or order number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="orderTrackingEnabled">Enable Order Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, customers can search for their orders on the /track-order page
                  </p>
                </div>
                <Switch
                  id="orderTrackingEnabled"
                  checked={settings.order_tracking_enabled}
                  onCheckedChange={(checked) => updateSetting('order_tracking_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>
                Manage security and access settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Blocking */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <Ban className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Customer Blocking</Label>
                    <p className="text-sm text-muted-foreground">
                      Block customers by phone, email, IP address, or device
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.blocking_enabled}
                    onCheckedChange={(checked) => updateSetting('blocking_enabled', checked)}
                  />
                  <Link to="/admin/customers">
                    <Button variant="outline" size="sm">
                      Manage
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>

              <Separator />

              {/* Guest Checkout */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="guestCheckout">Allow Guest Checkout</Label>
                  <p className="text-sm text-muted-foreground">
                    Customers can checkout without creating an account
                  </p>
                </div>
                <Switch
                  id="guestCheckout"
                  checked={settings.guest_checkout_enabled}
                  onCheckedChange={(checked) => updateSetting('guest_checkout_enabled', checked)}
                />
              </div>

              <Separator />

              {/* Roles & Permissions */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Roles & Permissions</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage admin users and their access levels
                    </p>
                  </div>
                </div>
                <Link to="/admin/roles">
                  <Button variant="outline" size="sm">
                    Manage
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
