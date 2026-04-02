import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newStatus: string;
  getStatusColor: (status: string) => string;
  onConfirm: (notes: string) => void;
}

export function StatusUpdateDialog({ open, onOpenChange, newStatus, getStatusColor, onConfirm }: StatusUpdateDialogProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) setNotes('');
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">New Status</Label>
            <div className="mt-1">
              <Badge variant="outline" className={`capitalize ${getStatusColor(newStatus)}`}>
                {newStatus}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-notes">Notes (optional)</Label>
            <Textarea
              id="status-notes"
              placeholder="Add context for this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This note will be visible in the order's status history.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
