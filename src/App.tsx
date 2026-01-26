import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { FacebookPixelProvider } from "@/components/FacebookPixelProvider";
import { DataLayerProvider } from "@/components/DataLayerProvider";
import { GoogleTagManagerProvider } from "@/components/GoogleTagManagerProvider";
import { SitePopup } from "@/components/SitePopup";
import { captureUtmParams } from "@/hooks/useUtmTracking";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import OrderHistory from "./pages/OrderHistory";
import Addresses from "./pages/Addresses";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import PaymentCallback from "./pages/PaymentCallback";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductEditor from "./pages/admin/AdminProductEditor";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCustomization from "./pages/admin/AdminCustomization";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminBlogs from "./pages/admin/AdminBlogs";
import AdminBlogCategories from "./pages/admin/AdminBlogCategories";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import DynamicPage from "./pages/DynamicPage";
import AdminPages from "./pages/admin/AdminPages";
import AdminNewsletter from "./pages/admin/AdminNewsletter";
import AdminPopups from "./pages/admin/AdminPopups";
import AdminLandingPages from "./pages/admin/AdminLandingPages";
import AdminLandingPageEditor from "./pages/admin/AdminLandingPageEditor";
import AdminLandingPageAnalytics from "./pages/admin/AdminLandingPageAnalytics";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

// Component to capture UTM params and track visitors on route changes
function UtmCapture() {
  const location = useLocation();
  
  // Track visitor session
  useVisitorTracking();
  
  useEffect(() => {
    captureUtmParams();
  }, [location.search]);
  
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SiteSettingsProvider>
        <CartProvider>
          <WishlistProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <UtmCapture />
                <ScrollToTop />
                <DataLayerProvider>
                  <GoogleTagManagerProvider>
                    <FacebookPixelProvider>
                      <SitePopup />
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/product/:slug" element={<ProductDetail />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/account/orders" element={<OrderHistory />} />
                        <Route path="/account/addresses" element={<Addresses />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/payment/callback" element={<PaymentCallback />} />
                        <Route path="/blog" element={<Blog />} />
                        <Route path="/blog/:slug" element={<BlogDetail />} />
                        {/* Admin Routes */}
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/products" element={<AdminProducts />} />
                        <Route path="/admin/products/new" element={<AdminProductEditor />} />
                        <Route path="/admin/products/:id/edit" element={<AdminProductEditor />} />
                        <Route path="/admin/orders" element={<AdminOrders />} />
                        <Route path="/admin/payments" element={<AdminPayments />} />
                        <Route path="/admin/customers" element={<AdminCustomers />} />
                        <Route path="/admin/categories" element={<AdminCategories />} />
                        <Route path="/admin/pages" element={<AdminPages />} />
                        <Route path="/admin/reviews" element={<AdminReviews />} />
                        <Route path="/admin/roles" element={<AdminRoles />} />
                        <Route path="/admin/blogs" element={<AdminBlogs />} />
                        <Route path="/admin/blog-categories" element={<AdminBlogCategories />} />
                        <Route path="/admin/customization" element={<AdminCustomization />} />
                        <Route path="/admin/newsletter" element={<AdminNewsletter />} />
                        <Route path="/admin/popups" element={<AdminPopups />} />
                        <Route path="/admin/landing-pages" element={<AdminLandingPages />} />
                        <Route path="/admin/landing-pages/:id/edit" element={<AdminLandingPageEditor />} />
                        <Route path="/admin/landing-pages/:id/analytics" element={<AdminLandingPageAnalytics />} />
                        <Route path="/admin/settings" element={<AdminSettings />} />
                        {/* Landing pages - public facing */}
                        <Route path="/lp/:slug" element={<LandingPage />} />
                        {/* Dynamic pages - must be last to catch remaining routes */}
                        <Route path="/:slug" element={<DynamicPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </FacebookPixelProvider>
                  </GoogleTagManagerProvider>
                </DataLayerProvider>
              </BrowserRouter>
            </TooltipProvider>
          </WishlistProvider>
        </CartProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
