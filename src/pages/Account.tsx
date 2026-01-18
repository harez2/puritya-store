import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Package, Heart, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import PageBreadcrumb from '@/components/layout/PageBreadcrumb';
import { useAuth } from '@/contexts/AuthContext';

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <Layout><div className="container mx-auto px-4 py-20 text-center">Loading...</div></Layout>;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <PageBreadcrumb items={[{ label: 'My Account' }]} className="mb-6" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl mb-8">My Account</h1>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <User className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Profile</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </CardHeader>
            </Card>

            <Link to="/wishlist">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Heart className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Wishlist</CardTitle>
                    <p className="text-sm text-muted-foreground">Your saved items</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>Orders</CardTitle>
                  <p className="text-sm text-muted-foreground">Track your orders</p>
                </div>
              </CardHeader>
            </Card>
          </div>

          <Button variant="outline" className="mt-8" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
}
