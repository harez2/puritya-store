import { useState } from 'react';
import { Facebook, Server, Monitor, CheckCircle, AlertCircle, ExternalLink, Shield, Key, Eye, EyeOff, ShoppingBag, Copy, Rss } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface FacebookPixelSetupProps {
  pixelId: string;
  capiEnabled: boolean;
  catalogId: string;
  catalogEnabled: boolean;
  onPixelIdChange: (value: string) => void;
  onCapiEnabledChange: (value: boolean) => void;
  onCatalogIdChange: (value: string) => void;
  onCatalogEnabledChange: (value: boolean) => void;
}

export function FacebookPixelSetup({
  pixelId,
  capiEnabled,
  catalogId,
  catalogEnabled,
  onPixelIdChange,
  onCapiEnabledChange,
  onCatalogIdChange,
  onCatalogEnabledChange,
}: FacebookPixelSetupProps) {
  const isPixelConfigured = pixelId.trim().length > 0;
  const isCatalogConfigured = catalogId.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Facebook className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Facebook Pixel & Conversions API</CardTitle>
              <CardDescription>
                Track customer actions and optimize your Facebook ads with both browser and server-side events
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Browser Pixel</div>
                <div className="text-xs text-muted-foreground">Client-side tracking</div>
              </div>
              <div className="ml-auto">
                {isPixelConfigured ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not configured</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Server className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Conversions API</div>
                <div className="text-xs text-muted-foreground">Server-side tracking</div>
              </div>
              <div className="ml-auto">
                {capiEnabled && isPixelConfigured ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Product Catalog</div>
                <div className="text-xs text-muted-foreground">Dynamic ads</div>
              </div>
              <div className="ml-auto">
                {catalogEnabled && isCatalogConfigured ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : catalogEnabled && !isCatalogConfigured ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Missing ID
                  </Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pixel ID Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pixel Configuration</CardTitle>
          <CardDescription>Enter your Facebook Pixel ID to enable tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pixel-id">Facebook Pixel ID</Label>
            <Input
              id="pixel-id"
              value={pixelId}
              onChange={(e) => onPixelIdChange(e.target.value.trim())}
              placeholder="Enter your Pixel ID (e.g., 1234567890123456)"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Find your Pixel ID in{' '}
              <a
                href="https://business.facebook.com/events_manager"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Facebook Events Manager
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Conversions API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversions API (Server-Side)</CardTitle>
          <CardDescription>
            Send events directly from your server for better accuracy and iOS 14+ compatibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="capi-toggle">Enable Conversions API</Label>
              <p className="text-xs text-muted-foreground">
                Send duplicate events server-side for improved tracking accuracy
              </p>
            </div>
            <Switch
              id="capi-toggle"
              checked={capiEnabled}
              onCheckedChange={onCapiEnabledChange}
              disabled={!isPixelConfigured}
            />
          </div>

          {capiEnabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Access Token Configured Securely</AlertTitle>
              <AlertDescription>
                Your Facebook Conversions API access token is stored securely as a server-side environment variable
                (FACEBOOK_CAPI_ACCESS_TOKEN). This protects your token from being exposed in client-side code or browser requests.
                To update the token, please contact your administrator to update the edge function secret in the backend settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Facebook Catalog Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Facebook Catalog</CardTitle>
              <CardDescription>
                Connect your product catalog for dynamic ads and Facebook/Instagram Shopping
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="catalog-toggle">Enable Facebook Catalog</Label>
              <p className="text-xs text-muted-foreground">
                Link product events to your catalog for retargeting and dynamic ads
              </p>
            </div>
            <Switch
              id="catalog-toggle"
              checked={catalogEnabled}
              onCheckedChange={onCatalogEnabledChange}
            />
          </div>

          {catalogEnabled && (
            <div className="space-y-2">
              <Label htmlFor="catalog-id">Catalog ID</Label>
              <Input
                id="catalog-id"
                value={catalogId}
                onChange={(e) => onCatalogIdChange(e.target.value.trim())}
                placeholder="Enter your Catalog ID (e.g., 1234567890123456)"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Find your Catalog ID in{' '}
                <a
                  href="https://business.facebook.com/commerce"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Facebook Commerce Manager
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          )}

          {catalogEnabled && !isCatalogConfigured && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Catalog ID Required</AlertTitle>
              <AlertDescription>
                Enter your Facebook Catalog ID above to enable product catalog integration.
              </AlertDescription>
            </Alert>
          )}

          {catalogEnabled && isCatalogConfigured && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Catalog Connected</AlertTitle>
                <AlertDescription>
                  Product events (ViewContent, AddToCart, Purchase) will include catalog product IDs 
                  for dynamic product ads and retargeting.
                </AlertDescription>
              </Alert>

              <Separator />

              {/* Product Feed URL Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Rss className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm">Product Feed URL</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this URL in Facebook Commerce Manager to automatically sync your products:
                </p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-feed`}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-feed`);
                        toast.success('XML feed URL copied!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-feed?format=csv`}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-feed?format=csv`);
                        toast.success('CSV feed URL copied!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    First URL returns XML format, second returns CSV format. Both are compatible with Facebook Catalog.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Catalog Features Enabled</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { name: 'Dynamic Ads', desc: 'Retarget with viewed products' },
                    { name: 'Instagram Shopping', desc: 'Tag products in posts' },
                    { name: 'Facebook Shops', desc: 'Sell directly on Facebook' },
                    { name: 'Advantage+ Catalog', desc: 'AI-powered ad optimization' },
                  ].map((feature) => (
                    <div key={feature.name} className="flex items-center gap-2 p-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{feature.name}</span>
                      <span className="text-muted-foreground">- {feature.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Events Being Tracked */}
      {isPixelConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tracked Events</CardTitle>
            <CardDescription>Events automatically tracked on your store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { name: 'PageView', desc: 'When a page is loaded' },
                { name: 'ViewContent', desc: 'When a product is viewed' },
                { name: 'AddToCart', desc: 'When added to cart' },
                { name: 'AddToWishlist', desc: 'When added to wishlist' },
                { name: 'InitiateCheckout', desc: 'When checkout starts' },
                { name: 'Purchase', desc: 'When order is completed' },
              ].map((event) => (
                <div key={event.name} className="flex items-center gap-2 p-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{event.name}</span>
                  <span className="text-muted-foreground">- {event.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy Note */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Privacy & Compliance</AlertTitle>
        <AlertDescription>
          Ensure your privacy policy discloses the use of Facebook Pixel and Conversions API. 
          Customer data is hashed before being sent to Facebook servers.
        </AlertDescription>
      </Alert>
    </div>
  );
}
