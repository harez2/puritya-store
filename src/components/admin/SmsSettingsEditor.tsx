import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmsSettings {
  enabled: boolean;
  orderConfirmationTemplate: string;
  orderShippedTemplate: string;
  orderDeliveredTemplate: string;
}

const defaultSettings: SmsSettings = {
  enabled: true,
  orderConfirmationTemplate: 'Dear {customer_name}, your order #{order_number} has been confirmed! Total: ৳{total}. Thank you for shopping with Puritya!',
  orderShippedTemplate: 'Dear {customer_name}, your order #{order_number} has been shipped! Track your delivery. - Puritya',
  orderDeliveredTemplate: 'Dear {customer_name}, your order #{order_number} has been delivered! Thank you for shopping with Puritya!',
};

export default function SmsSettingsEditor() {
  const [settings, setSettings] = useState<SmsSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

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
          orderConfirmationTemplate: typeof value.orderConfirmationTemplate === 'string' 
            ? value.orderConfirmationTemplate 
            : defaultSettings.orderConfirmationTemplate,
          orderShippedTemplate: typeof value.orderShippedTemplate === 'string' 
            ? value.orderShippedTemplate 
            : defaultSettings.orderShippedTemplate,
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
        orderConfirmationTemplate: settings.orderConfirmationTemplate,
        orderShippedTemplate: settings.orderShippedTemplate,
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

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { phone: testPhone, message: testMessage },
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
            {/* Order Confirmation Template */}
            <div className="space-y-2">
              <Label>Order Confirmation Message</Label>
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

            {/* Order Shipped Template */}
            <div className="space-y-2">
              <Label>Order Shipped Message</Label>
              <Textarea
                value={settings.orderShippedTemplate}
                onChange={(e) => setSettings({ ...settings, orderShippedTemplate: e.target.value })}
                placeholder="Enter order shipped SMS template..."
                rows={3}
              />
            </div>

            {/* Order Delivered Template */}
            <div className="space-y-2">
              <Label>Order Delivered Message</Label>
              <Textarea
                value={settings.orderDeliveredTemplate}
                onChange={(e) => setSettings({ ...settings, orderDeliveredTemplate: e.target.value })}
                placeholder="Enter order delivered SMS template..."
                rows={3}
              />
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
