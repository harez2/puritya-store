import { useState } from 'react';
import { Ban, ShieldAlert, CalendarIcon } from 'lucide-react';
import { format, addDays, addHours, addMinutes } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface BlockCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlocked: () => void;
  prefillData?: {
    email?: string;
    phone?: string;
    name?: string;
  };
}

export function BlockCustomerDialog({ open, onOpenChange, onBlocked, prefillData }: BlockCustomerDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState(prefillData?.email || '');
  const [phone, setPhone] = useState(prefillData?.phone || '');
  const [deviceId, setDeviceId] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [useEmail, setUseEmail] = useState(!!prefillData?.email);
  const [usePhone, setUsePhone] = useState(!!prefillData?.phone);
  const [useDeviceId, setUseDeviceId] = useState(false);
  const [useIpAddress, setUseIpAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Expiry settings
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryType, setExpiryType] = useState<'preset' | 'custom'>('preset');
  const [expiryPreset, setExpiryPreset] = useState('1d');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

  const resetForm = () => {
    setEmail('');
    setPhone('');
    setDeviceId('');
    setIpAddress('');
    setReason('');
    setNotes('');
    setCustomMessage('');
    setUseEmail(false);
    setUsePhone(false);
    setUseDeviceId(false);
    setUseIpAddress(false);
    setHasExpiry(false);
    setExpiryType('preset');
    setExpiryPreset('1d');
    setExpiryDate(undefined);
  };

  const getExpiryDate = (): string | null => {
    if (!hasExpiry) return null;
    
    if (expiryType === 'custom' && expiryDate) {
      return expiryDate.toISOString();
    }
    
    const now = new Date();
    switch (expiryPreset) {
      case '30m': return addMinutes(now, 30).toISOString();
      case '1h': return addHours(now, 1).toISOString();
      case '6h': return addHours(now, 6).toISOString();
      case '12h': return addHours(now, 12).toISOString();
      case '1d': return addDays(now, 1).toISOString();
      case '3d': return addDays(now, 3).toISOString();
      case '7d': return addDays(now, 7).toISOString();
      case '30d': return addDays(now, 30).toISOString();
      case '90d': return addDays(now, 90).toISOString();
      default: return null;
    }
  };

  const handleSubmit = async () => {
    if (!useEmail && !usePhone && !useDeviceId && !useIpAddress) {
      toast.error('Please select at least one identifier to block');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for blocking');
      return;
    }
    if (useEmail && !email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (usePhone && !phone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
    if (useDeviceId && !deviceId.trim()) {
      toast.error('Please enter a device ID');
      return;
    }
    if (useIpAddress && !ipAddress.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('blocked_customers').insert({
        email: useEmail ? email.trim().toLowerCase() : null,
        phone: usePhone ? phone.trim() : null,
        device_id: useDeviceId ? deviceId.trim() : null,
        ip_address: useIpAddress ? ipAddress.trim() : null,
        reason: reason.trim(),
        notes: notes.trim() || null,
        custom_message: customMessage.trim() || null,
        expires_at: getExpiryDate(),
        blocked_by: user?.id,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Customer blocked successfully');
      resetForm();
      onOpenChange(false);
      onBlocked();
    } catch (error: any) {
      console.error('Error blocking customer:', error);
      toast.error(error.message || 'Failed to block customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Block Customer
          </DialogTitle>
          <DialogDescription>
            Block a customer from placing orders using one or more identifiers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identifier Selection */}
          <div className="space-y-3">
            <Label className="font-semibold">Block by (select at least one):</Label>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="useEmail"
                  checked={useEmail}
                  onCheckedChange={(checked) => setUseEmail(checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="useEmail" className="cursor-pointer">Email Address</Label>
                  {useEmail && (
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="usePhone"
                  checked={usePhone}
                  onCheckedChange={(checked) => setUsePhone(checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="usePhone" className="cursor-pointer">Phone Number</Label>
                  {usePhone && (
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+8801XXXXXXXXX"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="useIpAddress"
                  checked={useIpAddress}
                  onCheckedChange={(checked) => setUseIpAddress(checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="useIpAddress" className="cursor-pointer">IP Address</Label>
                  {useIpAddress && (
                    <Input
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      placeholder="192.168.1.1"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="useDeviceId"
                  checked={useDeviceId}
                  onCheckedChange={(checked) => setUseDeviceId(checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="useDeviceId" className="cursor-pointer">Device ID / Fingerprint</Label>
                  {useDeviceId && (
                    <Input
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      placeholder="Device identifier"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Block Duration */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="hasExpiry"
                checked={hasExpiry}
                onCheckedChange={(checked) => setHasExpiry(checked as boolean)}
              />
              <Label htmlFor="hasExpiry" className="cursor-pointer font-semibold">
                Time-limited block
              </Label>
            </div>

            {hasExpiry && (
              <div className="ml-6 space-y-3">
                <Select value={expiryType} onValueChange={(v) => setExpiryType(v as 'preset' | 'custom')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preset">Quick duration</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>

                {expiryType === 'preset' ? (
                  <Select value={expiryPreset} onValueChange={setExpiryPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30m">30 minutes</SelectItem>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="6h">6 hours</SelectItem>
                      <SelectItem value="12h">12 hours</SelectItem>
                      <SelectItem value="1d">1 day</SelectItem>
                      <SelectItem value="3d">3 days</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="90d">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expiryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={setExpiryDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Blocking *</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Fraud, Repeated cancellations, Abusive behavior"
            />
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="customMessage">Custom Block Message (optional)</Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Override the default message shown to this customer..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default blocked message.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details (only visible to admins)..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Ban className="h-4 w-4 mr-2" />
            {submitting ? 'Blocking...' : 'Block Customer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
