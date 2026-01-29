import { useEffect, useState } from 'react';
import { Search, Ban, ShieldCheck, Trash2, Plus, AlertTriangle, MessageSquare, Save, Power, Clock } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BlockCustomerDialog } from './BlockCustomerDialog';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface BlockedCustomer {
  id: string;
  email: string | null;
  phone: string | null;
  device_id: string | null;
  ip_address: string | null;
  reason: string;
  notes: string | null;
  custom_message: string | null;
  blocked_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function BlockedCustomersManager() {
  const { settings, updateSetting, updateSettings } = useSiteSettings();
  const [blockedCustomers, setBlockedCustomers] = useState<BlockedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState(settings.blocked_message || '');
  const [blockingEnabled, setBlockingEnabled] = useState(settings.blocking_enabled ?? true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setBlockedMessage(settings.blocked_message || '');
    setBlockingEnabled(settings.blocking_enabled ?? true);
  }, [settings.blocked_message, settings.blocking_enabled]);

  useEffect(() => {
    fetchBlockedCustomers();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings({
        blocked_message: blockedMessage,
        blocking_enabled: blockingEnabled,
      });
      toast.success('Blocking settings updated');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  async function fetchBlockedCustomers() {
    try {
      const { data, error } = await supabase
        .from('blocked_customers')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      setBlockedCustomers(data || []);
    } catch (error) {
      console.error('Error fetching blocked customers:', error);
      toast.error('Failed to load blocked customers');
    } finally {
      setLoading(false);
    }
  }

  const handleToggleStatus = async () => {
    if (!toggleId) return;
    
    const customer = blockedCustomers.find(c => c.id === toggleId);
    if (!customer) return;

    try {
      const { error } = await supabase
        .from('blocked_customers')
        .update({ is_active: !customer.is_active })
        .eq('id', toggleId);

      if (error) throw error;

      toast.success(customer.is_active ? 'Customer unblocked' : 'Customer blocked again');
      setToggleId(null);
      fetchBlockedCustomers();
    } catch (error: any) {
      console.error('Error toggling block status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('blocked_customers')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast.success('Block record deleted');
      setDeleteId(null);
      fetchBlockedCustomers();
    } catch (error: any) {
      console.error('Error deleting block record:', error);
      toast.error(error.message || 'Failed to delete');
    }
  };

  const filteredCustomers = blockedCustomers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(searchQuery) ||
      customer.device_id?.toLowerCase().includes(searchLower) ||
      customer.ip_address?.includes(searchQuery) ||
      customer.reason.toLowerCase().includes(searchLower)
    );
  });

  const activeBlocks = blockedCustomers.filter(c => {
    if (!c.is_active) return false;
    if (c.expires_at && isPast(new Date(c.expires_at))) return false;
    return true;
  }).length;

  const getBlockStatus = (customer: BlockedCustomer) => {
    if (!customer.is_active) {
      return { label: 'Inactive', variant: 'secondary' as const };
    }
    if (customer.expires_at && isPast(new Date(customer.expires_at))) {
      return { label: 'Expired', variant: 'outline' as const };
    }
    return { label: 'Active', variant: 'destructive' as const };
  };

  return (
    <div className="space-y-6">
      {/* Global Blocking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            Blocking System Settings
          </CardTitle>
          <CardDescription>
            Control the global blocking system and customize the default message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Blocking System */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable Blocking System</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, blocked customers will be able to place orders.
              </p>
            </div>
            <Switch
              checked={blockingEnabled}
              onCheckedChange={setBlockingEnabled}
            />
          </div>

          {/* Default Blocked Message */}
          <div className="space-y-2">
            <Label htmlFor="blockedMessage" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Default Blocked Message
            </Label>
            <Textarea
              id="blockedMessage"
              value={blockedMessage}
              onChange={(e) => setBlockedMessage(e.target.value)}
              placeholder="Enter the default message shown to blocked customers..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This message is shown when a blocked customer tries to checkout. Individual blocks can override this.
            </p>
          </div>

          <Button onClick={handleSaveSettings} disabled={savingSettings}>
            <Save className="h-4 w-4 mr-2" />
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Blocked Customers List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Blocked Customers
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {activeBlocks} active block{activeBlocks !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setIsBlockDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Block Customer
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, phone, IP, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No matching blocked customers' : 'No blocked customers yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifiers</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => {
                    const status = getBlockStatus(customer);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Email:</span>{' '}
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Phone:</span>{' '}
                                {customer.phone}
                              </div>
                            )}
                            {customer.ip_address && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">IP:</span>{' '}
                                <code className="bg-muted px-1 rounded text-xs">
                                  {customer.ip_address}
                                </code>
                              </div>
                            )}
                            {customer.device_id && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Device:</span>{' '}
                                <code className="bg-muted px-1 rounded text-xs">
                                  {customer.device_id.slice(0, 20)}...
                                </code>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <div>{customer.reason}</div>
                                  {customer.custom_message && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Custom message set
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              {(customer.notes || customer.custom_message) && (
                                <TooltipContent className="max-w-xs">
                                  {customer.custom_message && (
                                    <p className="mb-2">
                                      <strong>Message:</strong> {customer.custom_message}
                                    </p>
                                  )}
                                  {customer.notes && (
                                    <p><strong>Notes:</strong> {customer.notes}</p>
                                  )}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {customer.expires_at ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(customer.expires_at), 'MMM d, yyyy HH:mm')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setToggleId(customer.id)}
                                  >
                                    {customer.is_active ? (
                                      <ShieldCheck className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Ban className="h-4 w-4 text-destructive" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {customer.is_active ? 'Unblock' : 'Block again'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setDeleteId(customer.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete record</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Block Dialog */}
          <BlockCustomerDialog
            open={isBlockDialogOpen}
            onOpenChange={setIsBlockDialogOpen}
            onBlocked={fetchBlockedCustomers}
          />

          {/* Toggle Confirmation */}
          <AlertDialog open={!!toggleId} onOpenChange={() => setToggleId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {blockedCustomers.find(c => c.id === toggleId)?.is_active
                    ? 'Unblock Customer?'
                    : 'Block Customer Again?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {blockedCustomers.find(c => c.id === toggleId)?.is_active
                    ? 'This customer will be able to place orders again.'
                    : 'This customer will be blocked from placing orders.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleStatus}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Block Record?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this block record. The customer will be able to place orders.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
