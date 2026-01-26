import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Copy, Rocket, BarChart3, MousePointerClick, ShoppingCart, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  sections: any[];
  created_at: string;
  updated_at: string;
}

interface AnalyticsEvent {
  landing_page_id: string;
  event_type: string;
}

export default function AdminLandingPages() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');

  const { data: landingPages = [], isLoading } = useQuery({
    queryKey: ['admin-landing-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LandingPage[];
    },
  });

  // Fetch analytics data
  const { data: analyticsData = [] } = useQuery({
    queryKey: ['landing-page-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_page_analytics')
        .select('landing_page_id, event_type');
      
      if (error) throw error;
      return data as AnalyticsEvent[];
    },
  });

  // Calculate analytics per page
  const pageAnalytics = useMemo(() => {
    const analytics: Record<string, { views: number; clicks: number; checkouts: number; purchases: number }> = {};
    
    analyticsData.forEach((event) => {
      if (!analytics[event.landing_page_id]) {
        analytics[event.landing_page_id] = { views: 0, clicks: 0, checkouts: 0, purchases: 0 };
      }
      
      if (event.event_type === 'view') analytics[event.landing_page_id].views++;
      else if (event.event_type === 'click') analytics[event.landing_page_id].clicks++;
      else if (event.event_type === 'checkout') analytics[event.landing_page_id].checkouts++;
      else if (event.event_type === 'purchase') analytics[event.landing_page_id].purchases++;
    });
    
    return analytics;
  }, [analyticsData]);

  const createMutation = useMutation({
    mutationFn: async ({ title, slug }: { title: string; slug: string }) => {
      const { data, error } = await supabase
        .from('landing_pages')
        .insert([{ 
          title, 
          slug,
          sections: getDefaultSections()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
      toast({ title: 'Landing page created' });
      setIsCreateDialogOpen(false);
      setNewPageTitle('');
      setNewPageSlug('');
      navigate(`/admin/landing-pages/${data.id}/edit`);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating page', 
        description: error.message?.includes('duplicate') 
          ? 'A page with this URL slug already exists' 
          : error.message, 
        variant: 'destructive' 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('landing_pages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
      toast({ title: 'Landing page deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting page', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'published' }) => {
      const { error } = await supabase
        .from('landing_pages')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
      toast({ title: 'Status updated' });
    },
    onError: (error) => {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setNewPageTitle(title);
    setNewPageSlug(generateSlug(title));
  };

  const handleCreate = () => {
    if (!newPageTitle.trim() || !newPageSlug.trim()) {
      toast({ title: 'Title and slug are required', variant: 'destructive' });
      return;
    }
    createMutation.mutate({ title: newPageTitle, slug: newPageSlug });
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/lp/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copied to clipboard' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Landing Pages</h1>
            <p className="text-muted-foreground">Create high-converting landing pages for campaigns</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Landing Page
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Landing Pages</CardTitle>
            <CardDescription>Manage your campaign landing pages</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : landingPages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No landing pages yet</p>
                <p className="text-sm mb-4">Create your first high-converting landing page</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Landing Page
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Analytics</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {landingPages.map((page) => {
                    const stats = pageAnalytics[page.id] || { views: 0, clicks: 0, checkouts: 0, purchases: 0 };
                    const conversionRate = stats.views > 0 
                      ? ((stats.checkouts / stats.views) * 100).toFixed(1) 
                      : '0.0';
                    
                    return (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">/lp/{page.slug}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyUrl(page.slug)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex items-center gap-3">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{stats.views}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Page Views</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-sm">
                                    <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{stats.clicks}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>CTA Clicks</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-sm">
                                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{stats.checkouts}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Checkouts</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant={Number(conversionRate) > 0 ? 'default' : 'secondary'} className="text-xs">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {conversionRate}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Conversion Rate (Checkouts / Views)</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({ 
                              id: page.id, 
                              status: page.status === 'published' ? 'draft' : 'published' 
                            })}
                            className={page.status === 'published' ? 'text-green-600' : 'text-muted-foreground'}
                          >
                            {page.status === 'published' ? (
                              <><Eye className="h-4 w-4 mr-1" /> Published</>
                            ) : (
                              <><EyeOff className="h-4 w-4 mr-1" /> Draft</>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(page.updated_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {page.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/lp/${page.slug}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/admin/landing-pages/${page.id}/edit`)}
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
                                  <AlertDialogTitle>Delete Landing Page</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{page.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(page.id)}
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
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Landing Page</DialogTitle>
            <DialogDescription>
              Enter a title for your new landing page. You can customize everything else in the editor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={newPageTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Summer Sale Campaign"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/lp/</span>
                <Input
                  id="slug"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="summer-sale"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create & Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Default sections for new landing pages
function getDefaultSections() {
  return [
    {
      id: crypto.randomUUID(),
      type: 'hero',
      content: {
        headline: 'Your Amazing Headline Here',
        subheadline: 'A compelling subheadline that explains your offer',
        ctaText: 'Get Started',
        ctaLink: '/shop',
        backgroundImage: '',
        backgroundColor: '#000000',
        textColor: '#ffffff',
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'features',
      content: {
        headline: 'Why Choose Us',
        features: [
          { icon: 'star', title: 'Feature 1', description: 'Description of your first amazing feature' },
          { icon: 'shield', title: 'Feature 2', description: 'Description of your second amazing feature' },
          { icon: 'zap', title: 'Feature 3', description: 'Description of your third amazing feature' },
        ],
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'cta',
      content: {
        headline: 'Ready to Get Started?',
        subheadline: 'Join thousands of satisfied customers',
        ctaText: 'Shop Now',
        ctaLink: '/shop',
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
      },
    },
  ];
}
