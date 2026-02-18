

# POS-Style Manual Order Page

## Overview
Replace the cramped dialog-based manual order system with a dedicated full-page POS (Point of Sale) interface at `/admin/pos`. The new layout will have a split-screen design: products on the left, cart/customer details on the right -- making it much faster and easier to create orders.

## Layout Design

The page will use a two-panel layout:

**Left Panel (60% width) - Product Browser**
- Category filter tabs at the top
- Search bar with instant filtering
- Product grid (cards with image, name, price) -- click to add to cart
- Each card shows a quick "+" button; clicking opens a small variant selector if sizes/colors exist

**Right Panel (40% width) - Order Cart & Customer**
- Cart items list with quantity controls, size/color selectors, remove buttons
- Running subtotal, shipping fee input, and total
- Collapsible "Customer Details" section: name, phone, address fields
- Payment method & status selectors
- Order notes field
- Large "Place Order" button at the bottom

## Technical Plan

### 1. New Page: `src/pages/admin/AdminPOS.tsx`
- Full-screen POS layout using AdminLayout wrapper
- Split into left (products) and right (cart) panels
- Reuses the same order creation logic from ManualOrderDialog (Supabase insert to `orders` + `order_items` + `order_status_history`)
- After successful order, shows a success toast with the order number and a "New Order" button to reset
- Fetches products with categories for filtering
- Uses shipping options from site settings

### 2. Route Addition in `src/App.tsx`
- Add route: `<Route path="/admin/pos" element={<AdminPOS />} />`

### 3. Sidebar Link in `src/components/admin/AdminSidebar.tsx`
- Add a "POS / New Order" link with a ShoppingCart or CreditCard icon in the admin sidebar

### 4. Update AdminOrders.tsx
- Change the "+ Manual Order" button to navigate to `/admin/pos` instead of opening the dialog
- Keep ManualOrderDialog.tsx as-is for backward compatibility (optional cleanup later)

### Key UX Improvements
- Products visible at all times (no need to search first)
- Category tabs for quick filtering
- Larger click targets for product cards
- Persistent cart view while browsing products
- More space for customer details
- Keyboard-friendly: search focuses automatically

