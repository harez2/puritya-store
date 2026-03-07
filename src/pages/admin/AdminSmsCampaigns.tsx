import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send, Eye, Trash2, Download, Users, MessageSquare, RefreshCw, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

type Campaign = {
  id: string;
  name: string;
  message: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  delivered_count: number;
  segment_filters: any;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type Recipient = {
  id: string;
  phone: string;
  customer_name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
};

type MatchedCustomer = {
  phone: string;
  customer_name: string;
  city: string;
  lifetime_value: number;
  avg_order_value: number;
  order_count: number;
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-destructive/10 text-destructive',
  pending: 'bg-muted text-muted-foreground',
  sent: 'bg-green-100 text-green-800',
};

export default function AdminSmsCampaigns() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [minLtv, setMinLtv] = useState('');
  const [maxLtv, setMaxLtv] = useState('');
  const [minAov, setMinAov] = useState('');
  const [maxAov, setMaxAov] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [matchedCustomers, setMatchedCustomers] = useState<MatchedCustomer[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Detail view state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [detailLoading, setDetailLoading] = useState(false);

  // Single SMS
  const [singlePhone, setSinglePhone] = useState('');
  const [singleName, setSingleName] = useState('');
  const [showSingleDialog, setShowSingleDialog] = useState(false);

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await supabase.from('sms_campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns((data as any[]) || []);
    setLoading(false);
  };

  const previewRecipients = async () => {
    setPreviewLoading(true);
    const filters: any = {};
    if (cityFilter) filters.city = cityFilter;
    if (minLtv) filters.min_ltv = minLtv;
    if (maxLtv) filters.max_ltv = maxLtv;
    if (minAov) filters.min_aov = minAov;
    if (maxAov) filters.max_aov = maxAov;
    if (orderStatusFilter) filters.order_status = orderStatusFilter;

    const { data, error } = await supabase.rpc('get_campaign_recipients', { filters });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setMatchedCustomers((data as MatchedCustomer[]) || []);
    }
    setPreviewLoading(false);
  };

  const createAndSendCampaign = async (recipientsList?: { phone: string; customer_name: string }[]) => {
    if (!name.trim() || !message.trim()) {
      toast({ title: 'Error', description: 'Name and message are required', variant: 'destructive' });
      return;
    }

    const targets = recipientsList || matchedCustomers;
    if (targets.length === 0) {
      toast({ title: 'Error', description: 'No recipients found. Preview first.', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const filters: any = {};
      if (cityFilter) filters.city = cityFilter;
      if (minLtv) filters.min_ltv = minLtv;
      if (maxLtv) filters.max_ltv = maxLtv;
      if (minAov) filters.min_aov = minAov;
      if (maxAov) filters.max_aov = maxAov;

      // Create campaign
      const { data: campaign, error: cErr } = await supabase.from('sms_campaigns').insert({
        name, message, segment_filters: filters,
        total_recipients: targets.length, status: 'draft',
      } as any).select().single();

      if (cErr) throw cErr;

      // Insert recipients
      const recipientRows = targets.map((c: any) => ({
        campaign_id: (campaign as any).id,
        phone: c.phone,
        customer_name: c.customer_name || null,
      }));

      const { error: rErr } = await supabase.from('sms_campaign_recipients').insert(recipientRows as any);
      if (rErr) throw rErr;

      // Trigger edge function
      const { error: fErr } = await supabase.functions.invoke('send-sms-campaign', {
        body: { campaign_id: (campaign as any).id },
      });
      if (fErr) console.error('Edge function error:', fErr);

      toast({ title: 'Campaign launched!', description: `Sending to ${targets.length} recipients` });
      resetForm();
      setActiveTab('list');
      fetchCampaigns();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setCreating(false);
  };

  const resetForm = () => {
    setName(''); setMessage(''); setCityFilter(''); setMinLtv(''); setMaxLtv('');
    setMinAov(''); setMaxAov(''); setMatchedCustomers([]); setSinglePhone(''); setSingleName('');
  };

  const viewCampaign = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailLoading(true);
    setActiveTab('detail');
    const { data } = await supabase.from('sms_campaign_recipients').select('*').eq('campaign_id', campaign.id).order('created_at');
    setRecipients((data as any[]) || []);
    setDetailLoading(false);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await supabase.from('sms_campaigns').delete().eq('id', id);
    fetchCampaigns();
    toast({ title: 'Campaign deleted' });
  };

  const downloadReport = () => {
    if (!selectedCampaign || recipients.length === 0) return;
    const filtered = recipientFilter === 'all' ? recipients : recipients.filter(r => r.status === recipientFilter);
    const csv = [
      ['Name', 'Phone', 'Status', 'Sent At', 'Error'].join(','),
      ...filtered.map(r => [
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        r.phone,
        r.status,
        r.sent_at ? format(new Date(r.sent_at), 'yyyy-MM-dd HH:mm') : '',
        `"${(r.error_message || '').replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${selectedCampaign.name.replace(/\s+/g, '-')}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendSingle = () => {
    if (!singlePhone.trim()) {
      toast({ title: 'Error', description: 'Phone number required', variant: 'destructive' });
      return;
    }
    setShowSingleDialog(false);
    createAndSendCampaign([{ phone: singlePhone, customer_name: singleName || 'Customer' }]);
  };

  const filteredRecipients = recipientFilter === 'all' ? recipients : recipients.filter(r => r.status === recipientFilter);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SMS Campaigns</h1>
            <p className="text-muted-foreground">Send targeted SMS campaigns to your customers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowSingleDialog(true); }}>
              <MessageSquare className="h-4 w-4 mr-2" /> Single SMS
            </Button>
            <Button onClick={() => { resetForm(); setActiveTab('create'); }}>
              <Plus className="h-4 w-4 mr-2" /> New Campaign
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Campaigns</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
            {selectedCampaign && <TabsTrigger value="detail">Report</TabsTrigger>}
          </TabsList>

          {/* LIST TAB */}
          <TabsContent value="list">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Campaigns</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchCampaigns}><RefreshCw className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : campaigns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No campaigns yet. Create your first one!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge className={statusColors[c.status] || ''}>{c.status}</Badge></TableCell>
                          <TableCell>{c.total_recipients}</TableCell>
                          <TableCell>{c.sent_count}</TableCell>
                          <TableCell>{c.failed_count}</TableCell>
                          <TableCell>{format(new Date(c.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => viewCampaign(c)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteCampaign(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CREATE TAB */}
          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Campaign Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Eid Sale Announcement" />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Hi {customer_name}, check out our latest deals!" rows={5} />
                    <p className="text-xs text-muted-foreground mt-1">Use {'{customer_name}'} as placeholder</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Customer Segmentation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>City / Location</Label>
                    <Input value={cityFilter} onChange={e => setCityFilter(e.target.value)} placeholder="e.g. Dhaka" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Min Lifetime Value</Label>
                      <Input type="number" value={minLtv} onChange={e => setMinLtv(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Max Lifetime Value</Label>
                      <Input type="number" value={maxLtv} onChange={e => setMaxLtv(e.target.value)} placeholder="Any" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Min Avg Order Value</Label>
                      <Input type="number" value={minAov} onChange={e => setMinAov(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Max Avg Order Value</Label>
                      <Input type="number" value={maxAov} onChange={e => setMaxAov(e.target.value)} placeholder="Any" />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={previewRecipients} disabled={previewLoading}>
                    <Users className="h-4 w-4 mr-2" /> {previewLoading ? 'Loading...' : 'Preview Matching Customers'}
                  </Button>

                  {matchedCustomers.length > 0 && (
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                      <p className="text-sm font-medium mb-2">{matchedCustomers.length} customers matched</p>
                      {matchedCustomers.slice(0, 50).map((c, i) => (
                        <div key={i} className="text-xs flex justify-between py-1 border-b last:border-0">
                          <span>{c.customer_name || 'N/A'}</span>
                          <span className="text-muted-foreground">{c.phone} · {c.city || 'N/A'} · ৳{Math.round(c.lifetime_value)}</span>
                        </div>
                      ))}
                      {matchedCustomers.length > 50 && <p className="text-xs text-muted-foreground mt-1">+{matchedCustomers.length - 50} more</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveTab('list')}>Cancel</Button>
              <Button onClick={() => createAndSendCampaign()} disabled={creating || matchedCustomers.length === 0}>
                <Send className="h-4 w-4 mr-2" /> {creating ? 'Sending...' : `Send to ${matchedCustomers.length} recipients`}
              </Button>
            </div>
          </TabsContent>

          {/* DETAIL TAB */}
          <TabsContent value="detail">
            {selectedCampaign && (
              <div className="space-y-4">
                <Button variant="ghost" onClick={() => setActiveTab('list')}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{selectedCampaign.total_recipients}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{selectedCampaign.sent_count}</p><p className="text-xs text-muted-foreground">Sent</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-destructive">{selectedCampaign.failed_count}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><Badge className={statusColors[selectedCampaign.status] || ''}>{selectedCampaign.status}</Badge><p className="text-xs text-muted-foreground mt-1">{selectedCampaign.completed_at ? format(new Date(selectedCampaign.completed_at), 'MMM d HH:mm') : 'In progress'}</p></CardContent></Card>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedCampaign.name} — Recipients</CardTitle>
                      <div className="flex gap-2">
                        <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={downloadReport}><Download className="h-4 w-4 mr-1" /> CSV</Button>
                        <Button variant="ghost" size="sm" onClick={() => viewCampaign(selectedCampaign)}><RefreshCw className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {detailLoading ? <p className="text-muted-foreground">Loading...</p> : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sent At</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRecipients.map(r => (
                            <TableRow key={r.id}>
                              <TableCell>{r.customer_name || 'N/A'}</TableCell>
                              <TableCell>{r.phone}</TableCell>
                              <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                              <TableCell>{r.sent_at ? format(new Date(r.sent_at), 'MMM d HH:mm') : '-'}</TableCell>
                              <TableCell className="text-xs text-destructive max-w-[200px] truncate">{r.error_message || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Single SMS Dialog */}
      <Dialog open={showSingleDialog} onOpenChange={setShowSingleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Single SMS</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Quick SMS" />
            </div>
            <div>
              <Label>Recipient Name</Label>
              <Input value={singleName} onChange={e => setSingleName(e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={singlePhone} onChange={e => setSinglePhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message..." rows={4} />
            </div>
            <Button className="w-full" onClick={handleSendSingle} disabled={creating}>
              <Send className="h-4 w-4 mr-2" /> Send SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
