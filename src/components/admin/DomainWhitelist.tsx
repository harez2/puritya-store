import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, X, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface DomainWhitelistSettings {
  enabled: boolean;
  domains: string[];
}

interface DomainWhitelistProps {
  onSettingsChange?: (settings: DomainWhitelistSettings) => void;
}

export function DomainWhitelist({ onSettingsChange }: DomainWhitelistProps) {
  const [enabled, setEnabled] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'newsletter_domain_whitelist')
        .eq('category', 'newsletter')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const settings = data.value as unknown as DomainWhitelistSettings;
        setEnabled(settings.enabled || false);
        setDomains(settings.domains || []);
        onSettingsChange?.(settings);
      }
    } catch (error) {
      console.error('Error fetching domain whitelist:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newEnabled: boolean, newDomains: string[]) => {
    setSaving(true);
    try {
      const settings: DomainWhitelistSettings = { enabled: newEnabled, domains: newDomains };
      
      // First check if setting exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'newsletter_domain_whitelist')
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('site_settings')
          .update({
            value: settings as unknown as Json,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'newsletter_domain_whitelist');
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('site_settings')
          .insert([{
            key: 'newsletter_domain_whitelist',
            category: 'newsletter',
            value: settings as unknown as Json
          }]);
        if (error) throw error;
      }
      
      onSettingsChange?.(settings);
      toast.success('Domain whitelist settings saved');
    } catch (error) {
      console.error('Error saving domain whitelist:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    await saveSettings(checked, domains);
  };

  const addDomain = async () => {
    const domain = newDomain.trim().toLowerCase();
    
    // Validate domain format
    if (!domain) {
      toast.error('Please enter a domain');
      return;
    }
    
    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      toast.error('Please enter a valid domain (e.g., example.com)');
      return;
    }
    
    if (domains.includes(domain)) {
      toast.error('Domain already exists');
      return;
    }

    const newDomains = [...domains, domain];
    setDomains(newDomains);
    setNewDomain('');
    await saveSettings(enabled, newDomains);
  };

  const removeDomain = async (domain: string) => {
    const newDomains = domains.filter(d => d !== domain);
    setDomains(newDomains);
    await saveSettings(enabled, newDomains);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Domain Whitelisting</CardTitle>
              <CardDescription>
                Only allow subscriptions from specific email domains
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="whitelist-enabled" className="text-sm">
              {enabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="whitelist-enabled"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Enter domain (e.g., company.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                disabled={saving}
              />
              <Button onClick={addDomain} disabled={saving || !newDomain.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {domains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No domains added. All email domains are currently allowed.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => (
                  <Badge
                    key={domain}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {domain}
                    <button
                      onClick={() => removeDomain(domain)}
                      className="ml-1 hover:text-destructive transition-colors"
                      disabled={saving}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              When enabled, only emails from these domains can subscribe to the newsletter.
            </p>
          </>
        )}

        {!enabled && (
          <p className="text-sm text-muted-foreground">
            Domain whitelisting is disabled. All email domains can subscribe.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
