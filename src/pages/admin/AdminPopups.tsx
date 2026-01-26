import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PopupImageUpload } from '@/components/admin/PopupImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';

interface Popup {
  id: string;
  title: string;
  content: string | null;
  cta_text: string | null;
  cta_link: string | null;
  cta_enabled: boolean;
  is_active: boolean;
  auto_close_seconds: number | null;
  show_close_button: boolean;
  background_color: string | null;
  text_color: string | null;
  display_delay_seconds: number | null;
  show_once_per_session: boolean | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PopupFormData {
  title: string;
  image_url: string | null;
  content: string;
  cta_text: string;
  cta_link: string;
  cta_enabled: boolean;
  is_active: boolean;
  auto_close_seconds: number;
  show_close_button: boolean;
  background_color: string;
  text_color: string;
  display_delay_seconds: number;
  show_once_per_session: boolean;
}

const defaultFormData: PopupFormData = {
  title: '',
  content: '',
  cta_text: 'Learn More',
  cta_link: '',
  cta_enabled: true,
  is_active: false,
  auto_close_seconds: 0,
  show_close_button: true,
  background_color: '#ffffff',
  text_color: '#000000',
  display_delay_seconds: 0,
  show_once_per_session: true,
  image_url: null,
};

export default function AdminPopups() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [formData, setFormData] = useState<PopupFormData>(defaultFormData);

  const { data: popups = [], isLoading } = useQuery({
    queryKey: ['admin-popups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Popup[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PopupFormData) => {
      if (editingPopup) {
        const { error } = await supabase
          .from('popups')
          .update(data)
          .eq('id', editingPopup.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('popups')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
      toast({ title: editingPopup ? 'Popup updated' : 'Popup created' });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ title: 'Error saving popup', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('popups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
      toast({ title: 'Popup deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting popup', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('popups')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
      toast({ title: 'Popup status updated' });
    },
    onError: (error) => {
      toast({ title: 'Error updating popup', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenCreate = () => {
    setEditingPopup(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (popup: Popup) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      content: popup.content || '',
      cta_text: popup.cta_text || '',
      cta_link: popup.cta_link || '',
      cta_enabled: popup.cta_enabled,
      is_active: popup.is_active,
      auto_close_seconds: popup.auto_close_seconds || 0,
      show_close_button: popup.show_close_button,
      background_color: popup.background_color || '#ffffff',
      text_color: popup.text_color || '#000000',
      display_delay_seconds: popup.display_delay_seconds || 0,
      show_once_per_session: popup.show_once_per_session ?? true,
      image_url: popup.image_url || null,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPopup(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Popups</h1>
            <p className="text-muted-foreground">Create and manage site popups</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Popup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPopup ? 'Edit Popup' : 'Create Popup'}</DialogTitle>
                <DialogDescription>
                  Configure your popup settings below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Popup title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Banner Image</Label>
                    <PopupImageUpload
                      image={formData.image_url}
                      onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                    />
                    <p className="text-xs text-muted-foreground">Optional banner displayed at top of popup</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Popup message content"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cta_text">CTA Button Text</Label>
                      <Input
                        id="cta_text"
                        value={formData.cta_text}
                        onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                        placeholder="Button text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cta_link">CTA Button Link</Label>
                      <Input
                        id="cta_link"
                        value={formData.cta_link}
                        onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="auto_close">Auto Close (seconds)</Label>
                      <Input
                        id="auto_close"
                        type="number"
                        min="0"
                        value={formData.auto_close_seconds}
                        onChange={(e) => setFormData({ ...formData, auto_close_seconds: parseInt(e.target.value) || 0 })}
                        placeholder="0 = never"
                      />
                      <p className="text-xs text-muted-foreground">0 = no auto close</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_delay">Display Delay (seconds)</Label>
                      <Input
                        id="display_delay"
                        type="number"
                        min="0"
                        value={formData.display_delay_seconds}
                        onChange={(e) => setFormData({ ...formData, display_delay_seconds: parseInt(e.target.value) || 0 })}
                        placeholder="0 = immediate"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bg_color">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bg_color"
                          type="color"
                          value={formData.background_color}
                          onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.background_color}
                          onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="text_color">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="text_color"
                          type="color"
                          value={formData.text_color}
                          onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.text_color}
                          onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable CTA Button</Label>
                        <p className="text-xs text-muted-foreground">Show the call-to-action button</p>
                      </div>
                      <Switch
                        checked={formData.cta_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, cta_enabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Close Button</Label>
                        <p className="text-xs text-muted-foreground">Allow users to close the popup</p>
                      </div>
                      <Switch
                        checked={formData.show_close_button}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_close_button: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Once Per Session</Label>
                        <p className="text-xs text-muted-foreground">Only show popup once per browser session</p>
                      </div>
                      <Switch
                        checked={formData.show_once_per_session}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_once_per_session: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Active</Label>
                        <p className="text-xs text-muted-foreground">Enable popup on the website</p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : editingPopup ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Popups</CardTitle>
            <CardDescription>Manage your website popups</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : popups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No popups created yet. Click "Create Popup" to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>CTA</TableHead>
                    <TableHead>Auto Close</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popups.map((popup) => (
                    <TableRow key={popup.id}>
                      <TableCell className="font-medium">{popup.title}</TableCell>
                      <TableCell>
                        {popup.image_url ? (
                          <div className="w-12 h-8 rounded overflow-hidden bg-muted">
                            <img src={popup.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> None
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {popup.cta_enabled ? (
                          <span className="text-sm">{popup.cta_text || 'No text'}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Disabled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {popup.auto_close_seconds ? `${popup.auto_close_seconds}s` : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ id: popup.id, is_active: !popup.is_active })}
                          className={popup.is_active ? 'text-green-600' : 'text-muted-foreground'}
                        >
                          {popup.is_active ? (
                            <><Eye className="h-4 w-4 mr-1" /> Active</>
                          ) : (
                            <><EyeOff className="h-4 w-4 mr-1" /> Inactive</>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(popup)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Popup</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{popup.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(popup.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
