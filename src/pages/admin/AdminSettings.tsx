import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Store, Shield, Package, MapPin, Ban, Users, ExternalLink, Hash, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ShippingOptionsEditor from '@/components/admin/ShippingOptionsEditor';
import PaymentSettingsEditor from '@/components/admin/PaymentSettingsEditor';
import SmsSettingsEditor from '@/components/admin/SmsSettingsEditor';
import InvoiceSettingsEditor from '@/components/admin/InvoiceSettingsEditor';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Link } from 'react-router-dom';
import { getDomainPrefix } from '@/lib/order-number';

interface ProductSettings {
  sizesEnabled: boolean;
  colorsEnabled: boolean;
}

const defaultProductSettings: ProductSettings = {
  sizesEnabled: true,
  colorsEnabled: true,
};

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  browserEnabled: boolean;
  smsEnabled: boolean;
  adminPhone: string;
  adminPhones: string[];
  adminSmsTemplate: string;
}

const DEFAULT_SMS_TEMPLATE = 'New order #{order_number} received! Total: ৳{total}. Customer: {customer_name}';

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  browserEnabled: true,
  smsEnabled: false,
  adminPhone: '',
  adminPhones: [],
  adminSmsTemplate: DEFAULT_SMS_TEMPLATE,
};

export default function AdminSettings() {
  const { settings, updateSetting } = useSiteSettings();
  const [productSettings, setProductSettings] = useState<ProductSettings>(defaultProductSettings);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [savingStore, setSavingStore] = useState(false);

  useEffect(() => {
    setStoreName(settings.store_name || '');
    setStoreEmail(settings.contact_email || '');
    setStorePhone(settings.contact_phone || '');
    setStoreUrl(settings.store_url || '');
  }, [settings.store_name, settings.contact_email, settings.contact_phone, settings.store_url]);

  const handleSaveStoreInfo = async () => {
    setSavingStore(true);
    try {
      await updateSetting('store_name', storeName);
      await updateSetting('contact_email', storeEmail);
      await updateSetting('contact_phone', storePhone);
      if (storeUrl) {
        await updateSetting('store_url', storeUrl);
      }
      toast.success('Store information saved');
    } catch (error) {
      console.error('Error saving store info:', error);
      toast.error('Failed to save store information');
    } finally {
      setSavingStore(false);
    }
  };

  useEffect(() => {
    fetchProductSettings();
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'admin_notification_settings')
        .maybeSingle();
      if (data?.value) {
        const raw = data.value as any;
        // Backward compat: migrate legacy adminPhone to adminPhones array
        if (raw.adminPhone && (!raw.adminPhones || raw.adminPhones.length === 0)) {
          raw.adminPhones = [raw.adminPhone];
        }
        setNotifSettings({ ...defaultNotificationSettings, ...raw });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const updateNotifSetting = async (key: keyof NotificationSettings, value: boolean | string | string[]) => {
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'admin_notification_settings',
          category: 'notifications',
          value: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      if (error) throw error;
      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
      setNotifSettings(notifSettings);
    }
  };

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
                  <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Contact Email</Label>
                  <Input id="storeEmail" type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storePhone">Phone Number</Label>
                  <Input id="storePhone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" defaultValue="BDT" disabled />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="storeUrl">Store URL / Domain</Label>
                  <Input
                    id="storeUrl"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="https://yourdomain.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your store's public URL. Used in product feeds (e.g., Facebook Catalog) and other integrations.
                  </p>
                </div>
              </div>
              <Separator />
              <Button onClick={handleSaveStoreInfo} disabled={savingStore}>
                {savingStore ? 'Saving...' : 'Save Changes'}
              </Button>
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
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deliveryBanner">Delivery Info Banner</Label>
                  <p className="text-sm text-muted-foreground">
                    Show delivery information banner on product pages
                  </p>
                </div>
                <Switch
                  id="deliveryBanner"
                  checked={settings.product_delivery_banner_enabled}
                  onCheckedChange={(checked) => updateSetting('product_delivery_banner_enabled', checked)}
                />
              </div>
              {settings.product_delivery_banner_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryBannerText">Banner Text</Label>
                    <Input
                      id="deliveryBannerText"
                      value={settings.product_delivery_banner_text}
                      onChange={(e) => updateSetting('product_delivery_banner_text', e.target.value)}
                      placeholder="🚚 Free delivery on orders over ৳5,000 • Cash on Delivery available"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Number Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                <CardTitle>Order Number Format</CardTitle>
              </div>
              <CardDescription>
                Customize how order numbers are generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useDomainPrefix">Use Domain Prefix</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically use the first 3 letters of your domain as the order prefix
                  </p>
                </div>
                <Switch
                  id="useDomainPrefix"
                  checked={settings.order_number_use_domain}
                  onCheckedChange={(checked) => updateSetting('order_number_use_domain', checked)}
                />
              </div>
              
              {settings.order_number_use_domain && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    Current domain prefix: <span className="font-mono font-bold">{getDomainPrefix()}</span>
                  </p>
                </div>
              )}
              
              {!settings.order_number_use_domain && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="orderPrefix">Custom Order Prefix</Label>
                    <Input
                      id="orderPrefix"
                      value={settings.order_number_prefix}
                      onChange={(e) => updateSetting('order_number_prefix', e.target.value.toUpperCase().slice(0, 5))}
                      placeholder="e.g., ORD, PUR, SHOP"
                      maxLength={5}
                      className="w-40 uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 5 characters. Will be used as: {settings.order_number_prefix || 'ORD'}-YYYYMMDD-XXXX
                    </p>
                  </div>
                </>
              )}
              
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Preview: <span className="font-mono font-medium text-foreground">
                    {settings.order_number_use_domain ? getDomainPrefix() : (settings.order_number_prefix || 'ORD')}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-1234
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Order Notifications</CardTitle>
              </div>
              <CardDescription>
                Get notified when new orders come in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifEnabled">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Master toggle for all new order notifications
                  </p>
                </div>
                <Switch
                  id="notifEnabled"
                  checked={notifSettings.enabled}
                  onCheckedChange={(checked) => updateNotifSetting('enabled', checked)}
                />
              </div>

              {notifSettings.enabled && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="soundEnabled">Sound Alert</Label>
                      <p className="text-sm text-muted-foreground">
                        Play a chime sound when a new order arrives
                      </p>
                    </div>
                    <Switch
                      id="soundEnabled"
                      checked={notifSettings.soundEnabled}
                      onCheckedChange={(checked) => updateNotifSetting('soundEnabled', checked)}
                    />
                  </div>

                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="browserEnabled">Browser Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show desktop push notifications (requires browser permission)
                      </p>
                    </div>
                    <Switch
                      id="browserEnabled"
                      checked={notifSettings.browserEnabled}
                      onCheckedChange={(checked) => updateNotifSetting('browserEnabled', checked)}
                    />
                  </div>

                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="smsEnabled">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send an SMS to the admin phone number for each new order
                      </p>
                    </div>
                    <Switch
                      id="smsEnabled"
                      checked={notifSettings.smsEnabled}
                      onCheckedChange={(checked) => updateNotifSetting('smsEnabled', checked)}
                    />
                  </div>

                  {notifSettings.smsEnabled && (
                    <div className="space-y-4">
                      {/* Multiple Admin Phone Numbers */}
                      <div className="space-y-2">
                        <Label>Admin Phone Numbers</Label>
                        <p className="text-xs text-muted-foreground">
                          These numbers will receive SMS alerts for every new order
                        </p>
                        {(notifSettings.adminPhones || []).map((phone, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={phone}
                              onChange={(e) => {
                                const updated = [...(notifSettings.adminPhones || [])];
                                updated[index] = e.target.value;
                                updateNotifSetting('adminPhones', updated);
                              }}
                              placeholder="e.g., 01XXXXXXXXX"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const updated = (notifSettings.adminPhones || []).filter((_, i) => i !== index);
                                updateNotifSetting('adminPhones', updated);
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = [...(notifSettings.adminPhones || []), ''];
                            updateNotifSetting('adminPhones', updated);
                          }}
                        >
                          + Add Phone Number
                        </Button>
                      </div>

                      {/* Custom SMS Template */}
                      <div className="space-y-2">
                        <Label htmlFor="adminSmsTemplate">SMS Message Template</Label>
                        <Textarea
                          id="adminSmsTemplate"
                          value={notifSettings.adminSmsTemplate || DEFAULT_SMS_TEMPLATE}
                          onChange={(e) => updateNotifSetting('adminSmsTemplate', e.target.value)}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Available placeholders: <code>{'{order_number}'}</code>, <code>{'{total}'}</code>, <code>{'{customer_name}'}</code>, <code>{'{phone}'}</code>, <code>{'{address}'}</code>
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Shipping Options */}
          <ShippingOptionsEditor />

          {/* Payment Settings (Methods + Gateways) */}
          <PaymentSettingsEditor />

          {/* SMS Notifications */}
          <SmsSettingsEditor />

          {/* Invoice Customization */}
          <InvoiceSettingsEditor />

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
