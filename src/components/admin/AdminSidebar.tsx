import { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Tags,
  Settings,
  Store,
  LogOut,
  Palette,
  Type,
  ALargeSmall,
  Menu,
  Image,
  Layout,
  MessageSquare,
  Code,
  FileCode2,
  Facebook,
  ChevronDown,
  Star,
  UserCog,
  FileText
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const mainNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Products', url: '/admin/products', icon: Package },
  { title: 'Orders', url: '/admin/orders', icon: ShoppingCart },
  { title: 'Customers', url: '/admin/customers', icon: Users },
  { title: 'Categories', url: '/admin/categories', icon: Tags },
  { title: 'Blog Posts', url: '/admin/blogs', icon: FileText },
  { title: 'Blog Categories', url: '/admin/blog-categories', icon: Tags },
  { title: 'Reviews', url: '/admin/reviews', icon: Star },
  { title: 'User Roles', url: '/admin/roles', icon: UserCog },
];

const customizationSubItems = [
  { title: 'Branding', tab: 'branding', icon: Type },
  { title: 'Fonts', tab: 'typography', icon: ALargeSmall },
  { title: 'Theme', tab: 'theme', icon: Palette },
  { title: 'Menus', tab: 'menus', icon: Menu },
  { title: 'Hero', tab: 'hero', icon: Image },
  { title: 'Homepage', tab: 'homepage', icon: Layout },
  { title: 'Footer', tab: 'footer', icon: MessageSquare },
  { title: 'CSS', tab: 'custom-css', icon: Code },
  { title: 'Scripts', tab: 'scripts', icon: FileCode2 },
  { title: 'Facebook', tab: 'facebook', icon: Facebook },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  
  const isCustomizationActive = location.pathname === '/admin/customization';
  const [customizationOpen, setCustomizationOpen] = useState(isCustomizationActive);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCustomizationTabClick = (tab: string) => {
    navigate(`/admin/customization?tab=${tab}`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <NavLink to="/admin" className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="font-display text-xl font-bold">Puritya Admin</span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/admin'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Customization with sub-menu */}
              <Collapsible
                open={customizationOpen}
                onOpenChange={setCustomizationOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      tooltip="Customization"
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-muted/50 w-full ${isCustomizationActive ? 'bg-primary/10 text-primary font-medium' : ''}`}
                    >
                      <Palette className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Customization</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {!collapsed && (
                      <SidebarMenuSub>
                        {customizationSubItems.map((item) => (
                          <SidebarMenuSubItem key={item.tab}>
                            <SidebarMenuSubButton
                              onClick={() => handleCustomizationTabClick(item.tab)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <NavLink 
                    to="/admin/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-muted/50"
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <Settings className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className="flex flex-col gap-2">
          <Button 
            variant="ghost" 
            className="justify-start gap-2 w-full" 
            onClick={() => navigate('/')}
          >
            <Store className="h-4 w-4" />
            {!collapsed && <span>View Store</span>}
          </Button>
          <Button 
            variant="ghost" 
            className="justify-start gap-2 w-full text-destructive hover:text-destructive" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
