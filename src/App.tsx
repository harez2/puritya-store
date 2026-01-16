import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { FacebookPixelProvider } from "@/components/FacebookPixelProvider";
import { DataLayerProvider } from "@/components/DataLayerProvider";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCustomization from "./pages/admin/AdminCustomization";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminRoles from "./pages/admin/AdminRoles";

const queryClient = new QueryClient();

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
                <DataLayerProvider>
                  <FacebookPixelProvider>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/shop" element={<Shop />} />
                      <Route path="/product/:slug" element={<ProductDetail />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/wishlist" element={<Wishlist />} />
                      <Route path="/checkout" element={<Checkout />} />
                      {/* Admin Routes */}
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/products" element={<AdminProducts />} />
                      <Route path="/admin/orders" element={<AdminOrders />} />
                      <Route path="/admin/customers" element={<AdminCustomers />} />
                      <Route path="/admin/categories" element={<AdminCategories />} />
                      <Route path="/admin/reviews" element={<AdminReviews />} />
                      <Route path="/admin/roles" element={<AdminRoles />} />
                      <Route path="/admin/customization" element={<AdminCustomization />} />
                      <Route path="/admin/settings" element={<AdminSettings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </FacebookPixelProvider>
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
