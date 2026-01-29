import { useState } from 'react';
import { Ban, ShieldAlert } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [useEmail, setUseEmail] = useState(!!prefillData?.email);
  const [usePhone, setUsePhone] = useState(!!prefillData?.phone);
  const [useDeviceId, setUseDeviceId] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPhone('');
    setDeviceId('');
    setReason('');
    setNotes('');
    setUseEmail(false);
    setUsePhone(false);
    setUseDeviceId(false);
  };

  const handleSubmit = async () => {
    if (!useEmail && !usePhone && !useDeviceId) {
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

    setSubmitting(true);
    try {
      const { error } = await supabase.from('blocked_customers').insert({
        email: useEmail ? email.trim().toLowerCase() : null,
        phone: usePhone ? phone.trim() : null,
        device_id: useDeviceId ? deviceId.trim() : null,
        reason: reason.trim(),
        notes: notes.trim() || null,
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
      <DialogContent className="max-w-md">
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
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
