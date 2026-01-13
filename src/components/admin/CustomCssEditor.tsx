import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CustomCssEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomCssEditor({ value, onChange }: CustomCssEditorProps) {
  const [cssError, setCssError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  // Basic CSS validation
  const validateCss = (css: string) => {
    if (!css.trim()) {
      setCssError(null);
      setIsValid(true);
      return;
    }

    try {
      // Check for balanced braces
      const openBraces = (css.match(/{/g) || []).length;
      const closeBraces = (css.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        setCssError(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
        setIsValid(false);
        return;
      }

      // Check for common syntax errors
      if (css.includes(';;')) {
        setCssError('Double semicolons detected');
        setIsValid(false);
        return;
      }

      setCssError(null);
      setIsValid(true);
    } catch (e) {
      setCssError('Invalid CSS syntax');
      setIsValid(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      validateCss(value);
    }, 500);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Custom CSS</AlertTitle>
        <AlertDescription>
          Add custom CSS to override default styles. Use with caution - incorrect CSS may break your store's layout.
        </AlertDescription>
      </Alert>

      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`/* Example custom CSS */
.hero-section {
  background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
}

.product-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

/* Target specific elements */
.btn-primary:hover {
  transform: scale(1.02);
}

/* Custom animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`}
          className="min-h-[400px] font-mono text-sm leading-relaxed resize-y"
          spellCheck={false}
        />
        
        {/* Status indicator */}
        <div className="absolute top-2 right-2">
          {value.trim() && (
            isValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )
          )}
        </div>
      </div>

      {cssError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>CSS Error</AlertTitle>
          <AlertDescription>{cssError}</AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Use CSS variables like <code className="bg-muted px-1 rounded">hsl(var(--primary))</code> for theme colors</li>
          <li>Target specific components with class selectors</li>
          <li>Use <code className="bg-muted px-1 rounded">!important</code> sparingly to override styles</li>
          <li>Test on different screen sizes after adding custom CSS</li>
        </ul>
      </div>
    </div>
  );
}
