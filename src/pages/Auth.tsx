import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { trackLogin, trackSignUp } from '@/lib/data-layer';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const checkUserRoleAndRedirect = async (userId: string) => {
    // Check if user is admin or moderator
    const { data: isAdmin } = await supabase.rpc('has_role', { 
      _user_id: userId, 
      _role: 'admin' 
    });
    
    if (isAdmin) {
      navigate('/admin');
      return;
    }

    const { data: isModerator } = await supabase.rpc('has_role', { 
      _user_id: userId, 
      _role: 'moderator' 
    });
    
    if (isModerator) {
      navigate('/admin');
      return;
    }

    // Regular user - go to account
    navigate('/account');
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error, data } = await signIn(
      formData.get('email') as string,
      formData.get('password') as string
    );
    
    if (error) {
      setLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      trackLogin('email');
      toast({ title: 'Welcome back!' });
      
      // Check role and redirect accordingly
      if (data?.user?.id) {
        await checkUserRoleAndRedirect(data.user.id);
      } else {
        navigate('/account');
      }
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error } = await signUp(
      formData.get('email') as string,
      formData.get('password') as string,
      formData.get('fullName') as string
    );
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      trackSignUp('email');
      toast({ title: 'Account created!', description: 'Welcome to Puritya.' });
      navigate('/account');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="font-display text-3xl">Welcome</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" name="email" type="email" required />
                    </div>
                    <div>
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" name="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" name="fullName" required />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="email" type="email" required />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" required minLength={6} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
