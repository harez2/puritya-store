-- Create custom permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create user_permissions for direct user permission overrides
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create pending_invites table for email invitations
CREATE TABLE public.pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role DEFAULT 'user',
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions (admins only for write, everyone can read)
CREATE POLICY "Everyone can view permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Admins can insert permissions" ON public.permissions FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update permissions" ON public.permissions FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete permissions" ON public.permissions FOR DELETE USING (is_admin(auth.uid()));

-- RLS Policies for role_permissions
CREATE POLICY "Everyone can view role permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can insert role permissions" ON public.role_permissions FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update role permissions" ON public.role_permissions FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete role permissions" ON public.role_permissions FOR DELETE USING (is_admin(auth.uid()));

-- RLS Policies for user_permissions
CREATE POLICY "Users can view their own permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user permissions" ON public.user_permissions FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert user permissions" ON public.user_permissions FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update user permissions" ON public.user_permissions FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete user permissions" ON public.user_permissions FOR DELETE USING (is_admin(auth.uid()));

-- RLS Policies for pending_invites
CREATE POLICY "Admins can view pending invites" ON public.pending_invites FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert pending invites" ON public.pending_invites FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can delete pending invites" ON public.pending_invites FOR DELETE USING (is_admin(auth.uid()));

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check direct user permission override (granted = true)
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id AND p.name = _permission_name AND up.granted = true
  ) OR (
    -- Check role-based permission if no direct override denies it
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = _user_id AND p.name = _permission_name
    ) AND NOT EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON up.permission_id = p.id
      WHERE up.user_id = _user_id AND p.name = _permission_name AND up.granted = false
    )
  )
$$;

-- Insert some default permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('manage_products', 'Create, edit, and delete products', 'products'),
  ('manage_orders', 'View and update order status', 'orders'),
  ('manage_customers', 'View and manage customer information', 'customers'),
  ('manage_categories', 'Create, edit, and delete categories', 'categories'),
  ('manage_reviews', 'Approve and delete product reviews', 'reviews'),
  ('manage_settings', 'Access and modify store settings', 'settings'),
  ('manage_users', 'Create users and manage roles', 'users'),
  ('view_reports', 'Access analytics and reports', 'reports'),
  ('manage_customization', 'Edit site theme and branding', 'customization');

-- Assign all permissions to admin role by default
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions;

-- Assign limited permissions to moderator role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator', id FROM public.permissions 
WHERE name IN ('manage_orders', 'manage_reviews', 'view_reports');