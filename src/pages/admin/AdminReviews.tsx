import { useState, useEffect } from 'react';
import { Star, Check, X, Trash2, Eye } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  approved: boolean;
  created_at: string;
  products?: {
    name: string;
    slug: string;
  };
  profiles?: {
    full_name: string | null;
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            rating >= star
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [deleteReview, setDeleteReview] = useState<Review | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      // Fetch reviews with product info
      const { data: reviewsData, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          products:product_id (name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (reviewsData && reviewsData.length > 0) {
        // Fetch profile names separately
        const userIds = [...new Set(reviewsData.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        const reviewsWithProfiles = reviewsData.map(r => ({
          ...r,
          profiles: { full_name: profileMap.get(r.user_id) || null }
        })) as Review[];
        
        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ approved: true })
        .eq('id', review.id);

      if (error) throw error;

      toast({ title: 'Review approved' });
      fetchReviews();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve review.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (review: Review) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ approved: false })
        .eq('id', review.id);

      if (error) throw error;

      toast({ title: 'Review rejected' });
      fetchReviews();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject review.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteReview) return;

    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', deleteReview.id);

      if (error) throw error;

      toast({ title: 'Review deleted' });
      setDeleteReview(null);
      fetchReviews();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete review.',
        variant: 'destructive',
      });
    }
  };

  const pendingReviews = reviews.filter((r) => !r.approved);
  const approvedReviews = reviews.filter((r) => r.approved);

  const ReviewsTable = ({ items }: { items: Review[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No reviews found
            </TableCell>
          </TableRow>
        ) : (
          items.map((review) => (
            <TableRow key={review.id}>
              <TableCell className="font-medium max-w-[200px] truncate">
                {review.products?.name || 'Unknown Product'}
              </TableCell>
              <TableCell>{review.profiles?.full_name || 'Anonymous'}</TableCell>
              <TableCell>
                <StarRating rating={review.rating} />
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{review.title}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedReview(review)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!review.approved && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleApprove(review)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {review.approved && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-orange-600 hover:text-orange-700"
                      onClick={() => handleReject(review)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteReview(review)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-semibold">Reviews</h1>
          <p className="text-muted-foreground">Manage customer reviews and approvals</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reviews</CardDescription>
              <CardTitle className="text-3xl">{reviews.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Approval</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{pendingReviews.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl text-green-600">{approvedReviews.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Reviews Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'approved')}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-2">
                  Pending
                  {pendingReviews.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{pendingReviews.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded" />
                    ))}
                  </div>
                ) : (
                  <ReviewsTable items={pendingReviews} />
                )}
              </TabsContent>
              <TabsContent value="approved">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded" />
                    ))}
                  </div>
                ) : (
                  <ReviewsTable items={approvedReviews} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* View Review Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              {selectedReview?.products?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedReview.profiles?.full_name || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedReview.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
                <Badge variant={selectedReview.approved ? 'default' : 'secondary'}>
                  {selectedReview.approved ? 'Approved' : 'Pending'}
                </Badge>
              </div>
              
              <div>
                <StarRating rating={selectedReview.rating} />
              </div>
              
              <div>
                <h4 className="font-medium mb-1">{selectedReview.title}</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedReview.content}</p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {!selectedReview.approved ? (
                  <Button
                    onClick={() => {
                      handleApprove(selectedReview);
                      setSelectedReview(null);
                    }}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleReject(selectedReview);
                      setSelectedReview(null);
                    }}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteReview(selectedReview);
                    setSelectedReview(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReview} onOpenChange={() => setDeleteReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
