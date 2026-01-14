import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Shield, Search, MoreHorizontal, UserPlus, UserMinus, Crown, Users, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type AppRole = 'admin' | 'moderator' | 'user';

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  roles: AppRole[];
  created_at: string;
}

const roleConfig: Record<AppRole, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Admin', color: 'bg-destructive text-destructive-foreground', icon: Crown },
  moderator: { label: 'Moderator', color: 'bg-primary text-primary-foreground', icon: Shield },
  user: { label: 'User', color: 'bg-muted text-muted-foreground', icon: Users },
};

export default function AdminRoles() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<AppRole | null>(null);
  const [roleToRemove, setRoleToRemove] = useState<AppRole | null>(null);

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  const fetchUsersWithRoles = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Get auth user emails via admin function or profile data
      // Since we can't query auth.users directly, we'll use what we have
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
        const roles = (userRoles || [])
          .filter((ur) => ur.user_id === profile.user_id)
          .map((ur) => ur.role as AppRole);

        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email: profile.phone || 'No email available', // Fallback since we can't access auth.users
          roles: roles.length > 0 ? roles : [],
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !roleToAdd) return;

    // Prevent self-demotion
    if (selectedUser.user_id === currentUser?.id && roleToAdd !== 'admin') {
      toast.error("You cannot modify your own admin role");
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.user_id,
          role: roleToAdd,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this role');
        } else {
          throw error;
        }
      } else {
        toast.success(`Added ${roleConfig[roleToAdd].label} role to ${selectedUser.full_name || 'user'}`);
        fetchUsersWithRoles();
      }
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to add role');
    } finally {
      setSelectedUser(null);
      setRoleToAdd(null);
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedUser || !roleToRemove) return;

    // Prevent self-demotion
    if (selectedUser.user_id === currentUser?.id && roleToRemove === 'admin') {
      toast.error("You cannot remove your own admin role");
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id)
        .eq('role', roleToRemove);

      if (error) throw error;

      toast.success(`Removed ${roleConfig[roleToRemove].label} role from ${selectedUser.full_name || 'user'}`);
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    } finally {
      setSelectedUser(null);
      setRoleToRemove(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter as AppRole);
    
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.roles.includes('admin')).length,
    moderators: users.filter(u => u.roles.includes('moderator')).length,
    noRoles: users.filter(u => u.roles.length === 0).length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            User Roles
          </h1>
          <p className="text-muted-foreground">Manage user permissions and access levels</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Crown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.moderators}</p>
                  <p className="text-sm text-muted-foreground">Moderators</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.noRoles}</p>
                  <p className="text-sm text-muted-foreground">No Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage user roles</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9 w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          {user.user_id === currentUser?.id && (
                            <Badge variant="outline" className="ml-2">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => {
                              const config = roleConfig[role];
                              const Icon = config.icon;
                              return (
                                <Badge key={role} className={config.color}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {config.label}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-muted-foreground text-sm">No roles assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(['admin', 'moderator', 'user'] as AppRole[])
                              .filter((role) => !user.roles.includes(role))
                              .map((role) => (
                                <DropdownMenuItem
                                  key={`add-${role}`}
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setRoleToAdd(role);
                                  }}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add {roleConfig[role].label}
                                </DropdownMenuItem>
                              ))}
                            {user.roles.map((role) => (
                              <DropdownMenuItem
                                key={`remove-${role}`}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setRoleToRemove(role);
                                }}
                                className="text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove {roleConfig[role].label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Role Confirmation Dialog */}
      <Dialog open={!!roleToAdd && !!selectedUser} onOpenChange={() => { setRoleToAdd(null); setSelectedUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to add the {roleToAdd && roleConfig[roleToAdd].label} role to {selectedUser?.full_name || 'this user'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRoleToAdd(null); setSelectedUser(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAddRole}>
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirmation Dialog */}
      <Dialog open={!!roleToRemove && !!selectedUser} onOpenChange={() => { setRoleToRemove(null); setSelectedUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the {roleToRemove && roleConfig[roleToRemove].label} role from {selectedUser?.full_name || 'this user'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRoleToRemove(null); setSelectedUser(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveRole}>
              Remove Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
