import { Check, Sparkles, Diamond } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { DesignMode, DESIGN_MODE_PRESETS, DesignModePreset } from '@/lib/design-modes';

interface DesignModeSelectorProps {
  currentMode: DesignMode;
  onModeChange: (mode: DesignMode, applyDefaults: boolean) => void;
}

function DesignModeCard({
  preset,
  isActive,
  onClick,
}: {
  preset: DesignModePreset;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = preset.id === 'generic' ? Sparkles : Diamond;
  
  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg relative overflow-hidden ${
        isActive 
          ? 'ring-2 ring-primary shadow-lg' 
          : 'hover:ring-1 hover:ring-primary/50'
      }`}
      onClick={onClick}
    >
      {isActive && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-primary text-primary-foreground rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        </div>
      )}
      
      <CardContent className="p-0">
        {/* Preview Section */}
        <div 
          className="h-36 relative overflow-hidden"
          style={{
            background: preset.id === 'modest' 
              ? `linear-gradient(145deg, 
                  hsl(${preset.colors.background.h}, ${preset.colors.background.s}%, ${preset.colors.background.l}%) 0%,
                  hsl(${preset.colors.secondary.h}, ${preset.colors.secondary.s}%, ${preset.colors.secondary.l}%) 100%
                )`
              : `linear-gradient(135deg, 
                  hsl(${preset.colors.background.h}, ${preset.colors.background.s}%, ${preset.colors.background.l}%) 0%,
                  hsl(${preset.colors.secondary.h}, ${preset.colors.secondary.s}%, ${preset.colors.secondary.l}%) 50%,
                  hsl(${preset.colors.accent.h}, ${preset.colors.accent.s}%, ${preset.colors.accent.l}%) 100%
                )`,
          }}
        >
          {/* Subtle pattern overlay for modest mode */}
          {preset.id === 'modest' && (
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          )}
          
          {/* Mini product cards preview */}
          <div className="absolute inset-4 flex gap-2 items-end">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 backdrop-blur-sm transition-all duration-300"
                style={{
                  height: `${50 + i * 10}%`,
                  backgroundColor: preset.id === 'modest' 
                    ? 'rgba(255,255,255,0.95)' 
                    : 'rgba(255,255,255,0.8)',
                  borderRadius: preset.styles.borderRadius === 'standard' ? '0.5rem' : 
                               preset.styles.borderRadius === 'soft' ? '0.25rem' : '1rem',
                  boxShadow: preset.styles.cardShadow === 'elegant'
                    ? '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)'
                    : preset.styles.cardShadow === 'soft' 
                      ? '0 4px 12px rgba(0,0,0,0.1)' 
                      : '0 1px 3px rgba(0,0,0,0.05)',
                  border: preset.id === 'modest' ? '1px solid rgba(0,0,0,0.04)' : 'none',
                }}
              />
            ))}
          </div>
          
          {/* Sample button */}
          <div className="absolute bottom-3 right-3">
            <div
              className="text-xs font-medium text-white transition-all"
              style={{
                backgroundColor: `hsl(${preset.colors.primary.h}, ${preset.colors.primary.s}%, ${preset.colors.primary.l}%)`,
                borderRadius: preset.styles.buttonStyle === 'rounded' 
                  ? '9999px' 
                  : preset.styles.buttonStyle === 'sleek' 
                    ? '0.125rem' 
                    : '0.375rem',
                padding: preset.styles.buttonStyle === 'sleek' 
                  ? '0.5rem 1rem' 
                  : '0.25rem 0.75rem',
                letterSpacing: preset.styles.buttonStyle === 'sleek' ? '0.1em' : 'normal',
                textTransform: preset.styles.buttonStyle === 'sleek' ? 'uppercase' : 'none',
                fontSize: preset.styles.buttonStyle === 'sleek' ? '0.625rem' : '0.75rem',
              }}
            >
              {preset.styles.buttonStyle === 'sleek' ? 'SHOP NOW' : 'Shop Now'}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{preset.name}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {preset.description}
          </p>

          {/* Color palette preview */}
          <div className="flex gap-1">
            {Object.entries(preset.colors).map(([name, color]) => (
              <div
                key={name}
                className="h-6 flex-1 rounded-sm"
                style={{
                  backgroundColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
                }}
                title={name}
              />
            ))}
          </div>

          {/* Font preview */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span style={{ fontFamily: `"${preset.fonts.heading}", serif` }} className="font-semibold">
              {preset.fonts.heading}
            </span>
            <span>+</span>
            <span style={{ fontFamily: `"${preset.fonts.body}", sans-serif` }}>
              {preset.fonts.body}
            </span>
          </div>

          <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
            {preset.tagline}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function DesignModeSelector({ currentMode, onModeChange }: DesignModeSelectorProps) {
  const [pendingMode, setPendingMode] = useState<DesignMode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCardClick = (mode: DesignMode) => {
    if (mode === currentMode) return;
    setPendingMode(mode);
    setDialogOpen(true);
  };

  const handleApplyWithDefaults = () => {
    if (pendingMode) {
      onModeChange(pendingMode, true);
    }
    setDialogOpen(false);
    setPendingMode(null);
  };

  const handleApplyKeepCustomizations = () => {
    if (pendingMode) {
      onModeChange(pendingMode, false);
    }
    setDialogOpen(false);
    setPendingMode(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(DESIGN_MODE_PRESETS).map((preset) => (
          <DesignModeCard
            key={preset.id}
            preset={preset}
            isActive={currentMode === preset.id}
            onClick={() => handleCardClick(preset.id)}
          />
        ))}
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-md" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">Switch Design Mode</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              You're switching to <strong>{pendingMode && DESIGN_MODE_PRESETS[pendingMode].name}</strong>. 
              How would you like to apply this change?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleApplyKeepCustomizations} className="rounded-md">
              Keep My Customizations
            </Button>
            <AlertDialogAction onClick={handleApplyWithDefaults} className="rounded-md">
              Apply with Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
