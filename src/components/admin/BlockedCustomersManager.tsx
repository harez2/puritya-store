import { useEffect, useState } from 'react';
import { Search, Ban, ShieldCheck, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface BlockedCustomer {
  id: string;
  email: string | null;
  phone: string | null;
  device_id: string | null;
  reason: string;
  notes: string | null;
  blocked_at: string;
  is_active: boolean;
}

export function BlockedCustomersManager() {
  const [blockedCustomers, setBlockedCustomers] = useState<BlockedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toggleId, setToggleId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedCustomers();
  }, []);

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
      customer.reason.toLowerCase().includes(searchLower)
    );
  });

  const activeBlocks = blockedCustomers.filter(c => c.is_active).length;

  return (
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
              placeholder="Search by email, phone, or reason..."
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
                  <TableHead>Blocked At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
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
                            <span className="cursor-help">{customer.reason}</span>
                          </TooltipTrigger>
                          {customer.notes && (
                            <TooltipContent>
                              <p className="max-w-xs">{customer.notes}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(customer.blocked_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {customer.is_active ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
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
                ))}
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
  );
}
