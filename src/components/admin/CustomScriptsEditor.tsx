import { useState } from 'react';
import { AlertTriangle, FileCode2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface CustomScriptsEditorProps {
  headScripts: string;
  bodyScripts: string;
  onHeadScriptsChange: (value: string) => void;
  onBodyScriptsChange: (value: string) => void;
}

export function CustomScriptsEditor({
  headScripts,
  bodyScripts,
  onHeadScriptsChange,
  onBodyScriptsChange,
}: CustomScriptsEditorProps) {
  const [activeTab, setActiveTab] = useState('head');

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Warning</AlertTitle>
        <AlertDescription>
          Only add scripts from trusted sources. Malicious scripts can compromise your store's security and your customers' data.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="head" className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4" />
            Head Scripts
          </TabsTrigger>
          <TabsTrigger value="body" className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4" />
            Body Scripts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="head" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="head-scripts">Scripts in &lt;head&gt;</Label>
            <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                Add tracking pixels, meta tags, stylesheets, or scripts that need to load early. 
                Common uses: Google Analytics, Facebook Pixel, custom fonts.
              </span>
            </div>
            <Textarea
              id="head-scripts"
              value={headScripts}
              onChange={(e) => onHeadScriptsChange(e.target.value)}
              placeholder={`<!-- Example: Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>

<!-- Example: Meta tag -->
<meta name="custom-meta" content="value">`}
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-medium text-sm mb-2">Recommended for Head:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Google Analytics / Google Tag Manager</li>
              <li>• Facebook Pixel / Meta Pixel</li>
              <li>• Custom meta tags for SEO</li>
              <li>• External stylesheet links</li>
              <li>• Preconnect/prefetch hints</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="body" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="body-scripts">Scripts in &lt;body&gt;</Label>
            <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                Add scripts that should load after the page content. 
                Common uses: Chat widgets, customer support tools, conversion tracking.
              </span>
            </div>
            <Textarea
              id="body-scripts"
              value={bodyScripts}
              onChange={(e) => onBodyScriptsChange(e.target.value)}
              placeholder={`<!-- Example: Chat widget -->
<script>
  (function() {
    // Your chat widget initialization code
  })();
</script>

<!-- Example: Conversion tracking -->
<script>
  // Track page views or events
</script>`}
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-medium text-sm mb-2">Recommended for Body:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Live chat widgets (Intercom, Tawk.to, Crisp)</li>
              <li>• Customer feedback tools</li>
              <li>• Heatmap & session recording (Hotjar, Clarity)</li>
              <li>• Push notification services</li>
              <li>• Any scripts that don't need to run immediately</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
