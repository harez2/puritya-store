import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, AlertCircle, Code2, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface GoogleTagManagerSetupProps {
  containerId: string;
  enabled: boolean;
  onContainerIdChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
}

export function GoogleTagManagerSetup({
  containerId,
  enabled,
  onContainerIdChange,
  onEnabledChange,
}: GoogleTagManagerSetupProps) {
  const [isValidFormat, setIsValidFormat] = useState(true);
  
  useEffect(() => {
    if (!containerId) {
      setIsValidFormat(true);
      return;
    }
    // GTM container ID format: GTM-XXXXXXX
    const gtmRegex = /^GTM-[A-Z0-9]{6,8}$/;
    setIsValidFormat(gtmRegex.test(containerId));
  }, [containerId]);
  
  const isConfigured = containerId && isValidFormat;
  
  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Google Tag Manager
              </CardTitle>
              <CardDescription>
                Connect GTM to manage all your analytics and marketing tags
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
          {/* Container ID */}
          <div className="space-y-2">
            <Label htmlFor="gtm_container_id">GTM Container ID</Label>
            <div className="flex gap-2">
              <Input
                id="gtm_container_id"
                value={containerId}
                onChange={(e) => onContainerIdChange(e.target.value.toUpperCase())}
                placeholder="GTM-XXXXXXX"
                className={!isValidFormat && containerId ? "border-destructive" : ""}
              />
            </div>
            {!isValidFormat && containerId && (
              <p className="text-sm text-destructive">
                Invalid format. Container ID should be like GTM-XXXXXXX
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Find your Container ID in GTM → Admin → Container Settings
            </p>
          </div>
          
          {/* Enable Switch */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div>
              <Label htmlFor="gtm_enabled" className="font-medium">Enable Google Tag Manager</Label>
              <p className="text-sm text-muted-foreground">
                Inject GTM scripts on all pages
              </p>
            </div>
            <Switch
              id="gtm_enabled"
              checked={enabled}
              onCheckedChange={onEnabledChange}
              disabled={!isConfigured}
            />
          </div>
          
          {isConfigured && enabled && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                GTM is active. The data layer is pre-configured with e-commerce events.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Data Layer Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Available Data Layer Events
          </CardTitle>
          <CardDescription>
            These events are automatically pushed to the data layer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="page-events">
              <AccordionTrigger>Page Events</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">page_view</Badge>
                    <span className="text-muted-foreground">Fired on every page navigation</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="ecommerce-events">
              <AccordionTrigger>E-commerce Events</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">view_item</Badge>
                    <span className="text-muted-foreground">When viewing a product detail page</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">view_item_list</Badge>
                    <span className="text-muted-foreground">When viewing product listings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">add_to_cart</Badge>
                    <span className="text-muted-foreground">When adding a product to cart</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">remove_from_cart</Badge>
                    <span className="text-muted-foreground">When removing a product from cart</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">view_cart</Badge>
                    <span className="text-muted-foreground">When opening the cart drawer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">begin_checkout</Badge>
                    <span className="text-muted-foreground">When starting checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">add_shipping_info</Badge>
                    <span className="text-muted-foreground">When shipping info is added</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">add_payment_info</Badge>
                    <span className="text-muted-foreground">When payment method is selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">purchase</Badge>
                    <span className="text-muted-foreground">When order is completed</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="user-events">
              <AccordionTrigger>User Events</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">login</Badge>
                    <span className="text-muted-foreground">When user signs in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">sign_up</Badge>
                    <span className="text-muted-foreground">When user creates an account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">search</Badge>
                    <span className="text-muted-foreground">When user searches for products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">add_to_wishlist</Badge>
                    <span className="text-muted-foreground">When adding to wishlist</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>GTM Setup Guide</CardTitle>
          <CardDescription>
            Configure Google Tag Manager to receive your data layer events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <a 
                href="https://tagmanager.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Create a GTM account <ExternalLink className="h-3 w-3" />
              </a>
              {" "}if you don't have one
            </li>
            <li>Create a new Container for your website (Web type)</li>
            <li>Copy your Container ID (GTM-XXXXXXX) and paste it above</li>
            <li>Enable GTM and save your settings</li>
            <li>In GTM, create tags for Google Analytics 4, conversion tracking, etc.</li>
            <li>Use the data layer events listed above as triggers</li>
          </ol>
          
          <div className="pt-4">
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://developers.google.com/tag-manager/ecommerce-ga4" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                GA4 E-commerce Documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
