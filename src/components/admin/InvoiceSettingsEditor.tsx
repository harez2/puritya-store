import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InvoiceConfig, defaultInvoiceConfig } from './OrderInvoice';

const toggleFields: { key: keyof InvoiceConfig; label: string; desc: string }[] = [
  { key: 'showLogo', label: 'Logo / Store Name', desc: 'Show store logo or name in the header' },
  { key: 'showInvoiceNumber', label: 'Invoice Number', desc: 'Display the order number on the invoice' },
  { key: 'showDate', label: 'Date', desc: 'Show order date and time' },
  { key: 'showOrderStatus', label: 'Order Status', desc: 'Display order status (Pending, Delivered, etc.)' },
  { key: 'showPaymentStatus', label: 'Payment Status', desc: 'Show payment status (Paid, Unpaid, etc.)' },
  { key: 'showBillTo', label: 'Customer Info (Bill To)', desc: 'Show customer name, phone, and address' },
  { key: 'showPaymentMethod', label: 'Payment Method', desc: 'Display the payment method used' },
  { key: 'showItemsTable', label: 'Items Table', desc: 'Show the product items table' },
  { key: 'showTotalQuantity', label: 'Total Quantity Row', desc: 'Show a summary row with total item count' },
  { key: 'showSubtotal', label: 'Subtotal', desc: 'Display the subtotal amount' },
  { key: 'showShippingFee', label: 'Shipping Fee', desc: 'Show the shipping fee' },
  { key: 'showTotal', label: 'Grand Total', desc: 'Display the total amount' },
  { key: 'showNotes', label: 'Order Notes', desc: 'Show order notes if present' },
];

export default function InvoiceSettingsEditor() {
  const [config, setConfig] = useState<InvoiceConfig>(defaultInvoiceConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'invoice_settings')
        .maybeSingle();
      if (data?.value) {
        setConfig({ ...defaultInvoiceConfig, ...(data.value as unknown as InvoiceConfig) });
      }
    } catch (err) {
      console.error('Error fetching invoice settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const save = async (updated: InvoiceConfig) => {
    setConfig(updated);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'invoice_settings',
          category: 'invoice',
          value: updated as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      if (error) throw error;
      toast.success('Invoice settings updated');
    } catch (err) {
      console.error('Error saving invoice settings:', err);
      toast.error('Failed to save invoice settings');
      setConfig(config);
    }
  };

  const handleToggle = (key: keyof InvoiceConfig, val: boolean) => {
    save({ ...config, [key]: val });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Invoice Customization</CardTitle>
        </div>
        <CardDescription>
          Choose which elements appear on your order invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {toggleFields.map((field, i) => (
          <div key={field.key}>
            {i > 0 && <Separator className="mb-4" />}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{field.label}</Label>
                <p className="text-sm text-muted-foreground">{field.desc}</p>
              </div>
              <Switch
                checked={config[field.key] as boolean}
                onCheckedChange={(checked) => handleToggle(field.key, checked)}
                disabled={loading}
              />
            </div>
          </div>
        ))}

        <Separator />
        <div className="space-y-2">
          <Label htmlFor="footerText">Custom Footer Text</Label>
          <Input
            id="footerText"
            value={config.footerText}
            onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
            onBlur={() => save(config)}
            placeholder="e.g., Thank you for your purchase!"
          />
          <p className="text-xs text-muted-foreground">
            This text will appear at the bottom of every invoice
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
