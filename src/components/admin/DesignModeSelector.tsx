import { Check, Sparkles, Leaf } from 'lucide-react';
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
  const Icon = preset.id === 'generic' ? Sparkles : Leaf;
  
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
          className="h-32 relative"
          style={{
            background: `linear-gradient(135deg, 
              hsl(${preset.colors.background.h}, ${preset.colors.background.s}%, ${preset.colors.background.l}%) 0%,
              hsl(${preset.colors.secondary.h}, ${preset.colors.secondary.s}%, ${preset.colors.secondary.l}%) 50%,
              hsl(${preset.colors.accent.h}, ${preset.colors.accent.s}%, ${preset.colors.accent.l}%) 100%
            )`,
          }}
        >
          {/* Mini product cards preview */}
          <div className="absolute inset-4 flex gap-2 items-end">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 bg-white/80 backdrop-blur-sm"
                style={{
                  height: `${50 + i * 10}%`,
                  borderRadius: preset.styles.borderRadius === 'standard' ? '0.5rem' : 
                               preset.styles.borderRadius === 'soft' ? '0.75rem' : '1rem',
                  boxShadow: preset.styles.cardShadow === 'soft' 
                    ? '0 4px 12px rgba(0,0,0,0.1)' 
                    : '0 1px 3px rgba(0,0,0,0.05)',
                }}
              />
            ))}
          </div>
          
          {/* Sample button */}
          <div className="absolute bottom-3 right-3">
            <div
              className="px-3 py-1 text-xs font-medium text-white"
              style={{
                backgroundColor: `hsl(${preset.colors.primary.h}, ${preset.colors.primary.s}%, ${preset.colors.primary.l}%)`,
                borderRadius: preset.styles.buttonStyle === 'rounded' ? '9999px' : '0.375rem',
              }}
            >
              Shop Now
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Design Mode</AlertDialogTitle>
            <AlertDialogDescription>
              You're switching to <strong>{pendingMode && DESIGN_MODE_PRESETS[pendingMode].name}</strong>. 
              How would you like to apply this change?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleApplyKeepCustomizations}>
              Keep My Customizations
            </Button>
            <AlertDialogAction onClick={handleApplyWithDefaults}>
              Apply with Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
