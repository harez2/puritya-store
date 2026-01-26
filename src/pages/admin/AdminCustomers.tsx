import { useEffect, useState } from 'react';
import { Search, User, MoreHorizontal, Eye, Shield, ShieldOff, Download, Filter, X, CalendarIcon } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface CustomerWithRole extends Profile {
  isAdmin: boolean;
  orderCount: number;
  totalSpent: number;
}

export default function AdminCustomers() {
  const { user: currentUser } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRole | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [orderCountFilter, setOrderCountFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch orders for each user
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total');

      if (ordersError) throw ordersError;

      // Combine data
      const customersWithData = (profiles || []).map(profile => {
        const userRoles = roles?.filter(r => r.user_id === profile.user_id) || [];
        const userOrders = orders?.filter(o => o.user_id === profile.user_id) || [];
        
        return {
          ...profile,
          isAdmin: userRoles.some(r => r.role === 'admin'),
          orderCount: userOrders.length,
          totalSpent: userOrders.reduce((sum, o) => sum + Number(o.total), 0),
        };
      });

      setCustomers(customersWithData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  const handleToggleAdmin = async (customer: CustomerWithRole) => {
    // Prevent self-demotion
    if (customer.user_id === currentUser?.id) {
      toast.error("You cannot remove your own admin role");
      return;
    }

    try {
      if (customer.isAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', customer.user_id)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Admin role removed');
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: customer.user_id, role: 'admin' });

        if (error) throw error;
        toast.success('Admin role granted');
      }
      
      fetchCustomers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    // Search filter
    const matchesSearch = 
      customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery);
    
    // Role filter
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'admin' && customer.isAdmin) ||
      (roleFilter === 'customer' && !customer.isAdmin);
    
    // Order count filter
    let matchesOrderCount = true;
    if (orderCountFilter === '0') {
      matchesOrderCount = customer.orderCount === 0;
    } else if (orderCountFilter === '1-5') {
      matchesOrderCount = customer.orderCount >= 1 && customer.orderCount <= 5;
    } else if (orderCountFilter === '6-10') {
      matchesOrderCount = customer.orderCount >= 6 && customer.orderCount <= 10;
    } else if (orderCountFilter === '10+') {
      matchesOrderCount = customer.orderCount > 10;
    }
    
    // Date range filter
    const customerDate = new Date(customer.created_at);
    const matchesDateFrom = !dateFrom || isAfter(customerDate, startOfDay(dateFrom)) || 
      customerDate.toDateString() === dateFrom.toDateString();
    const matchesDateTo = !dateTo || isBefore(customerDate, endOfDay(dateTo)) ||
      customerDate.toDateString() === dateTo.toDateString();
    
    return matchesSearch && matchesRole && matchesOrderCount && matchesDateFrom && matchesDateTo;
  });

  const hasActiveFilters = roleFilter !== 'all' || orderCountFilter !== 'all' || dateFrom || dateTo;

  const resetFilters = () => {
    setRoleFilter('all');
    setOrderCountFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const exportCustomers = () => {
    const csv = [
      ['Name', 'Phone', 'Role', 'Orders', 'Total Spent (BDT)', 'Joined'],
      ...filteredCustomers.map(c => [
        c.full_name || 'Unnamed',
        c.phone || '',
        c.isAdmin ? 'Admin' : 'Customer',
        c.orderCount.toString(),
        c.totalSpent.toString(),
        format(new Date(c.created_at), 'yyyy-MM-dd')
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Customers exported');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">Manage your customer base</p>
          </div>
          <Button onClick={exportCustomers} disabled={customers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={orderCountFilter} onValueChange={setOrderCountFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="0">No orders</SelectItem>
                    <SelectItem value="1-5">1-5 orders</SelectItem>
                    <SelectItem value="6-10">6-10 orders</SelectItem>
                    <SelectItem value="10+">10+ orders</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PP") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PP") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Role</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Orders</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total Spent</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={customer.avatar_url || undefined} />
                              <AvatarFallback>{getInitials(customer.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{customer.full_name || 'Unnamed'}</p>
                              <p className="text-sm text-muted-foreground">
                                Joined {format(new Date(customer.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {customer.phone || '-'}
                        </td>
                        <td className="py-3 px-2">
                          {customer.isAdmin ? (
                            <Badge variant="default" className="bg-primary">Admin</Badge>
                          ) : (
                            <Badge variant="secondary">Customer</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">{customer.orderCount}</td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(customer.totalSpent)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedCustomer(customer);
                                setIsDetailsOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleAdmin(customer)}
                                disabled={customer.user_id === currentUser?.id}
                              >
                                {customer.isAdmin ? (
                                  <>
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    Remove Admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make Admin
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCustomer.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedCustomer.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCustomer.full_name || 'Unnamed'}</h3>
                  {selectedCustomer.isAdmin && (
                    <Badge variant="default" className="bg-primary">Admin</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedCustomer.phone || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{format(new Date(selectedCustomer.created_at), 'PPP')}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span>{selectedCustomer.orderCount}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Total Spent</span>
                  <span className="font-semibold">{formatCurrency(selectedCustomer.totalSpent)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
