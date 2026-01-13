import { useState, useEffect } from 'react';
import { Facebook, Server, Monitor, CheckCircle, AlertCircle, ExternalLink, Shield, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FacebookPixelSetupProps {
  pixelId: string;
  capiEnabled: boolean;
  onPixelIdChange: (value: string) => void;
  onCapiEnabledChange: (value: boolean) => void;
  hasAccessToken: boolean;
}

export function FacebookPixelSetup({
  pixelId,
  capiEnabled,
  onPixelIdChange,
  onCapiEnabledChange,
  hasAccessToken,
}: FacebookPixelSetupProps) {
  const isPixelConfigured = pixelId.trim().length > 0;
  const isCapiReady = isPixelConfigured && hasAccessToken;

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
          <div className="grid gap-4 md:grid-cols-2">
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
                {capiEnabled && isCapiReady ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : capiEnabled && !hasAccessToken ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Missing Token
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

          {capiEnabled && !hasAccessToken && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Access Token Required</AlertTitle>
              <AlertDescription>
                To use the Conversions API, you need to add your Facebook Access Token. 
                Generate one in Facebook Events Manager under Settings → Conversions API → Generate Access Token.
              </AlertDescription>
            </Alert>
          )}

          {capiEnabled && hasAccessToken && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Conversions API Active</AlertTitle>
              <AlertDescription>
                Server-side events will be sent alongside browser events for improved tracking accuracy 
                and iOS 14+ compatibility. Events are deduplicated using event IDs.
              </AlertDescription>
            </Alert>
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
