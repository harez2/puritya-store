import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmsSettings {
  enabled: boolean;
  apiKey: string;
  senderId: string;
  useCustomApi: boolean;
  orderConfirmationEnabled: boolean;
  orderConfirmationTemplate: string;
  orderShippedEnabled: boolean;
  orderShippedTemplate: string;
  orderDeliveredEnabled: boolean;
  orderDeliveredTemplate: string;
}

const defaultSettings: SmsSettings = {
  enabled: true,
  apiKey: '',
  senderId: '',
  useCustomApi: false,
  orderConfirmationEnabled: true,
  orderConfirmationTemplate: 'Dear {customer_name}, your order #{order_number} has been confirmed! Total: ৳{total}. Thank you for shopping with Puritya!',
  orderShippedEnabled: true,
  orderShippedTemplate: 'Dear {customer_name}, your order #{order_number} has been shipped! Track your delivery. - Puritya',
  orderDeliveredEnabled: true,
  orderDeliveredTemplate: 'Dear {customer_name}, your order #{order_number} has been delivered! Thank you for shopping with Puritya!',
};

export default function SmsSettingsEditor() {
  const [settings, setSettings] = useState<SmsSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch balance when settings load or when custom API is toggled
  useEffect(() => {
    if (!loading && settings.enabled) {
      fetchBalance();
    }
  }, [loading, settings.enabled, settings.useCustomApi, settings.apiKey]);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const requestBody: { customApiKey?: string } = {};
      
      if (settings.useCustomApi && settings.apiKey) {
        requestBody.customApiKey = settings.apiKey;
      }

      const { data, error } = await supabase.functions.invoke('sms-balance', {
        body: requestBody,
      });

      if (error) throw error;

      if (data?.success) {
        setBalance(data.balance);
      } else {
        setBalanceError(data?.error || 'Failed to fetch balance');
        setBalance(null);
      }
    } catch (error: unknown) {
      console.error('Error fetching SMS balance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch balance';
      setBalanceError(errorMessage);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'sms_settings')
        .maybeSingle();

      if (error) throw error;
      if (data?.value && typeof data.value === 'object') {
        const value = data.value as Record<string, unknown>;
        setSettings({
          enabled: typeof value.enabled === 'boolean' ? value.enabled : defaultSettings.enabled,
          apiKey: typeof value.apiKey === 'string' ? value.apiKey : defaultSettings.apiKey,
          senderId: typeof value.senderId === 'string' ? value.senderId : defaultSettings.senderId,
          useCustomApi: typeof value.useCustomApi === 'boolean' ? value.useCustomApi : defaultSettings.useCustomApi,
          orderConfirmationEnabled: typeof value.orderConfirmationEnabled === 'boolean' 
            ? value.orderConfirmationEnabled 
            : defaultSettings.orderConfirmationEnabled,
          orderConfirmationTemplate: typeof value.orderConfirmationTemplate === 'string' 
            ? value.orderConfirmationTemplate 
            : defaultSettings.orderConfirmationTemplate,
          orderShippedEnabled: typeof value.orderShippedEnabled === 'boolean' 
            ? value.orderShippedEnabled 
            : defaultSettings.orderShippedEnabled,
          orderShippedTemplate: typeof value.orderShippedTemplate === 'string' 
            ? value.orderShippedTemplate 
            : defaultSettings.orderShippedTemplate,
          orderDeliveredEnabled: typeof value.orderDeliveredEnabled === 'boolean' 
            ? value.orderDeliveredEnabled 
            : defaultSettings.orderDeliveredEnabled,
          orderDeliveredTemplate: typeof value.orderDeliveredTemplate === 'string' 
            ? value.orderDeliveredTemplate 
            : defaultSettings.orderDeliveredTemplate,
        });
      }
    } catch (error) {
      console.error('Error fetching SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'sms_settings')
        .maybeSingle();

      const settingsValue = {
        enabled: settings.enabled,
        apiKey: settings.apiKey,
        senderId: settings.senderId,
        useCustomApi: settings.useCustomApi,
        orderConfirmationEnabled: settings.orderConfirmationEnabled,
        orderConfirmationTemplate: settings.orderConfirmationTemplate,
        orderShippedEnabled: settings.orderShippedEnabled,
        orderShippedTemplate: settings.orderShippedTemplate,
        orderDeliveredEnabled: settings.orderDeliveredEnabled,
        orderDeliveredTemplate: settings.orderDeliveredTemplate,
      };

      let error;
      if (existing) {
        const result = await supabase
          .from('site_settings')
          .update({
            value: settingsValue,
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'sms_settings');
        error = result.error;
      } else {
        const result = await supabase
          .from('site_settings')
          .insert({
            key: 'sms_settings',
            category: 'notifications',
            value: settingsValue,
          });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'SMS settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving SMS settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save SMS settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number for testing.',
        variant: 'destructive',
      });
      return;
    }

    setSendingTest(true);
    try {
      const testMessage = settings.orderConfirmationTemplate
        .replace('{customer_name}', 'Test Customer')
        .replace('{order_number}', 'TEST-001')
        .replace('{total}', '1,500');

      // Prepare request body with custom API credentials if configured
      const requestBody: { 
        phone: string; 
        message: string; 
        customApiKey?: string; 
        customSenderId?: string; 
      } = { 
        phone: testPhone, 
        message: testMessage 
      };

      if (settings.useCustomApi && settings.apiKey && settings.senderId) {
        requestBody.customApiKey = settings.apiKey;
        requestBody.customSenderId = settings.senderId;
      }

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: requestBody,
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Test SMS sent',
          description: `SMS sent successfully to ${testPhone}`,
        });
      } else {
        throw new Error(data?.error || 'Failed to send SMS');
      }
    } catch (error: unknown) {
      console.error('Error sending test SMS:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send test SMS.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>SMS Notifications</CardTitle>
        </div>
        <CardDescription>
          Configure SMS notifications for order updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable SMS */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable SMS Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Send SMS alerts to customers for order updates
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        {settings.enabled && (
          <>
            {/* SMS Balance Display */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-base font-medium">SMS Balance</Label>
                  <p className="text-sm text-muted-foreground">
                    Your remaining SMS credits
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {balanceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : balance !== null ? (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    ৳{parseFloat(balance).toLocaleString()}
                  </Badge>
                ) : balanceError ? (
                  <span className="text-sm text-destructive">{balanceError}</span>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={fetchBalance}
                  disabled={balanceLoading}
                  title="Refresh balance"
                >
                  <RefreshCw className={`h-4 w-4 ${balanceLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* SMS API Configuration */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Custom API Configuration</Label>
                  <p className="text-sm text-muted-foreground">
                    Use custom BulkSMSBD API credentials (overrides environment variables)
                  </p>
                </div>
                <Switch
                  checked={settings.useCustomApi}
                  onCheckedChange={(checked) => setSettings({ ...settings, useCustomApi: checked })}
                />
              </div>

              {settings.useCustomApi && (
                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={settings.apiKey}
                      onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                      placeholder="Enter your BulkSMSBD API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senderId">Sender ID</Label>
                    <Input
                      id="senderId"
                      value={settings.senderId}
                      onChange={(e) => setSettings({ ...settings, senderId: e.target.value })}
                      placeholder="Enter your sender ID (e.g., 8809648904894)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Order Confirmation Template */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Order Confirmation Message</Label>
                  <p className="text-sm text-muted-foreground">
                    Sent when a new order is placed
                  </p>
                </div>
                <Switch
                  checked={settings.orderConfirmationEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, orderConfirmationEnabled: checked })}
                />
              </div>
              {settings.orderConfirmationEnabled && (
                <div className="space-y-2 pt-2">
                  <Textarea
                    value={settings.orderConfirmationTemplate}
                    onChange={(e) => setSettings({ ...settings, orderConfirmationTemplate: e.target.value })}
                    placeholder="Enter order confirmation SMS template..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {'{customer_name}'}, {'{order_number}'}, {'{total}'}
                  </p>
                </div>
              )}
            </div>

            {/* Order Shipped Template */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Order Shipped Message</Label>
                  <p className="text-sm text-muted-foreground">
                    Sent when order status changes to shipped
                  </p>
                </div>
                <Switch
                  checked={settings.orderShippedEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, orderShippedEnabled: checked })}
                />
              </div>
              {settings.orderShippedEnabled && (
                <div className="space-y-2 pt-2">
                  <Textarea
                    value={settings.orderShippedTemplate}
                    onChange={(e) => setSettings({ ...settings, orderShippedTemplate: e.target.value })}
                    placeholder="Enter order shipped SMS template..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {'{customer_name}'}, {'{order_number}'}
                  </p>
                </div>
              )}
            </div>

            {/* Order Delivered Template */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Order Delivered Message</Label>
                  <p className="text-sm text-muted-foreground">
                    Sent when order status changes to delivered
                  </p>
                </div>
                <Switch
                  checked={settings.orderDeliveredEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, orderDeliveredEnabled: checked })}
                />
              </div>
              {settings.orderDeliveredEnabled && (
                <div className="space-y-2 pt-2">
                  <Textarea
                    value={settings.orderDeliveredTemplate}
                    onChange={(e) => setSettings({ ...settings, orderDeliveredTemplate: e.target.value })}
                    placeholder="Enter order delivered SMS template..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available placeholders: {'{customer_name}'}, {'{order_number}'}
                  </p>
                </div>
              )}
            </div>

            {/* Test SMS */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Send Test SMS</Label>
              <div className="flex gap-2">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Enter phone number (e.g., 01712345678)"
                  className="flex-1"
                />
                <Button onClick={sendTestSms} disabled={sendingTest} variant="outline">
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Test</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send a test SMS using the order confirmation template
              </p>
            </div>
          </>
        )}

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save SMS Settings
        </Button>
      </CardContent>
    </Card>
  );
}
