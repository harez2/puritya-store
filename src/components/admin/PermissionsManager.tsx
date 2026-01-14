import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Shield, Key, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

interface RolePermission {
  id: string;
  role: 'admin' | 'moderator' | 'user';
  permission_id: string;
}

type AppRole = 'admin' | 'moderator' | 'user';

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  user: 'User',
};

export default function PermissionsManager() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPermission, setNewPermission] = useState({ name: '', description: '', category: 'general' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Set<AppRole>>>(new Map());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [permissionsRes, rolePermissionsRes] = await Promise.all([
        supabase.from('permissions').select('*').order('category', { ascending: true }),
        supabase.from('role_permissions').select('*'),
      ]);

      if (permissionsRes.error) throw permissionsRes.error;
      if (rolePermissionsRes.error) throw rolePermissionsRes.error;

      setPermissions(permissionsRes.data || []);
      setRolePermissions(rolePermissionsRes.data || []);
      
      // Initialize pending changes with current state
      const initial = new Map<string, Set<AppRole>>();
      (permissionsRes.data || []).forEach(p => {
        const roles = new Set<AppRole>();
        (rolePermissionsRes.data || [])
          .filter(rp => rp.permission_id === p.id)
          .forEach(rp => roles.add(rp.role as AppRole));
        initial.set(p.id, roles);
      });
      setPendingChanges(initial);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    if (!newPermission.name.trim()) {
      toast.error('Permission name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('permissions')
        .insert({
          name: newPermission.name.toLowerCase().replace(/\s+/g, '_'),
          description: newPermission.description || null,
          category: newPermission.category,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Permission created');
      setNewPermission({ name: '', description: '', category: 'general' });
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating permission:', error);
      toast.error(error.message || 'Failed to create permission');
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase.from('permissions').delete().eq('id', permissionId);
      if (error) throw error;
      toast.success('Permission deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('Failed to delete permission');
    }
  };

  const toggleRolePermission = (permissionId: string, role: AppRole) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      const roles = new Set(newMap.get(permissionId) || []);
      if (roles.has(role)) {
        roles.delete(role);
      } else {
        roles.add(role);
      }
      newMap.set(permissionId, roles);
      return newMap;
    });
  };

  const hasRolePermission = (permissionId: string, role: AppRole): boolean => {
    return pendingChanges.get(permissionId)?.has(role) || false;
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Delete all existing role permissions
      await supabase.from('role_permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert new role permissions
      const inserts: { role: AppRole; permission_id: string }[] = [];
      pendingChanges.forEach((roles, permissionId) => {
        roles.forEach(role => {
          inserts.push({ role, permission_id: permissionId });
        });
      });

      if (inserts.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(inserts);
        if (error) throw error;
      }

      toast.success('Permissions saved');
      fetchData();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categories = Object.keys(groupedPermissions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Custom Permissions
          </h2>
          <p className="text-sm text-muted-foreground">Define and assign permissions to roles</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveChanges} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Permission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Permission</DialogTitle>
                <DialogDescription>Add a new custom permission to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="permName">Permission Name</Label>
                  <Input
                    id="permName"
                    placeholder="e.g., manage_inventory"
                    value={newPermission.name}
                    onChange={(e) => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permDesc">Description</Label>
                  <Input
                    id="permDesc"
                    placeholder="What this permission allows"
                    value={newPermission.description}
                    onChange={(e) => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permCategory">Category</Label>
                  <Select
                    value={newPermission.category}
                    onValueChange={(value) => setNewPermission(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="orders">Orders</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="settings">Settings</SelectItem>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                      <SelectItem value="customization">Customization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePermission}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Permission</TableHead>
                  <TableHead>Description</TableHead>
                  {(['admin', 'moderator', 'user'] as AppRole[]).map(role => (
                    <TableHead key={role} className="text-center w-[100px]">
                      {roleLabels[role]}
                    </TableHead>
                  ))}
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(category => (
                  <>
                    <TableRow key={`cat-${category}`} className="bg-muted/50">
                      <TableCell colSpan={5} className="font-medium capitalize py-2">
                        {category}
                      </TableCell>
                    </TableRow>
                    {groupedPermissions[category].map(permission => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">{permission.name}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {permission.description || '-'}
                        </TableCell>
                        {(['admin', 'moderator', 'user'] as AppRole[]).map(role => (
                          <TableCell key={role} className="text-center">
                            <Checkbox
                              checked={hasRolePermission(permission.id, role)}
                              onCheckedChange={() => toggleRolePermission(permission.id, role)}
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeletePermission(permission.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
