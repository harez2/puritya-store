import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface GoogleAnalyticsSetupProps {
  measurementId: string;
  enabled: boolean;
  onMeasurementIdChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
}

export function GoogleAnalyticsSetup({
  measurementId,
  enabled,
  onMeasurementIdChange,
  onEnabledChange,
}: GoogleAnalyticsSetupProps) {
  const [isValidFormat, setIsValidFormat] = useState(true);

  useEffect(() => {
    if (!measurementId) {
      setIsValidFormat(true);
      return;
    }
    // GA4 Measurement ID format: G-XXXXXXXXXX
    const ga4Regex = /^G-[A-Z0-9]{8,12}$/;
    setIsValidFormat(ga4Regex.test(measurementId));
  }, [measurementId]);

  const isConfigured = measurementId && isValidFormat;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Google Analytics 4
              </CardTitle>
              <CardDescription>
                Track e-commerce events and user behavior with GA4
              </CardDescription>
            </div>
            <Badge variant={isConfigured && enabled ? "default" : "secondary"}>
              {isConfigured && enabled ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
              ) : (
                "Not Configured"
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ga_measurement_id">Measurement ID</Label>
            <Input
              id="ga_measurement_id"
              value={measurementId}
              onChange={(e) => onMeasurementIdChange(e.target.value.toUpperCase())}
              placeholder="G-XXXXXXXXXX"
              className={!isValidFormat && measurementId ? "border-destructive" : ""}
            />
            {!isValidFormat && measurementId && (
              <p className="text-sm text-destructive">
                Invalid format. Measurement ID should be like G-XXXXXXXXXX
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Find your Measurement ID in GA4 → Admin → Data Streams → Web
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <Label htmlFor="ga_enabled" className="font-medium">Enable Google Analytics</Label>
              <p className="text-sm text-muted-foreground">
                Inject GA4 gtag.js script and send e-commerce events
              </p>
            </div>
            <Switch
              id="ga_enabled"
              checked={enabled}
              onCheckedChange={onEnabledChange}
              disabled={!isConfigured}
            />
          </div>

          {isConfigured && enabled && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                GA4 is active. E-commerce events (view_item, add_to_cart, purchase, etc.) are automatically tracked.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* E-commerce Events Info */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked E-commerce Events</CardTitle>
          <CardDescription>
            These GA4 e-commerce events are sent automatically via gtag.js
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              { event: 'page_view', desc: 'Every page navigation' },
              { event: 'view_item', desc: 'Product detail page viewed' },
              { event: 'view_item_list', desc: 'Product listing viewed' },
              { event: 'add_to_cart', desc: 'Product added to cart' },
              { event: 'remove_from_cart', desc: 'Product removed from cart' },
              { event: 'view_cart', desc: 'Cart drawer opened' },
              { event: 'begin_checkout', desc: 'Checkout started' },
              { event: 'add_shipping_info', desc: 'Shipping info added' },
              { event: 'add_payment_info', desc: 'Payment method selected' },
              { event: 'purchase', desc: 'Order completed' },
              { event: 'login', desc: 'User signed in' },
              { event: 'sign_up', desc: 'User registered' },
            ].map(({ event, desc }) => (
              <div key={event} className="flex items-center gap-2">
                <Badge variant="outline">{event}</Badge>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Open Google Analytics <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Go to Admin → Data Streams → select your web stream</li>
            <li>Copy the Measurement ID (G-XXXXXXXXXX) and paste above</li>
            <li>Enable Google Analytics and save your settings</li>
          </ol>
          <div className="pt-4">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://developers.google.com/analytics/devguides/collection/ga4/ecommerce"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                GA4 E-commerce Docs
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
