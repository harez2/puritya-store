

## Detailed Analytics Page for Admin Panel

### What We're Building
A new **Admin Analytics** page (`/admin/analytics`) with comprehensive e-commerce analytics organized into tabbed sections, each with customizable date range and filter controls.

### Page Structure

**Global Filter Bar** (top of page, applies to all tabs):
- Date range picker (Today, 7d, 30d, 90d, 1y, Custom)
- Order status filter
- Order source filter (Cart, POS, Manual)
- Category filter
- Export button (CSV/PDF)

**Tabs:**

1. **Revenue & Orders** - Revenue over time chart, orders over time, AOV trend, revenue by payment method, orders by status breakdown, revenue by source (Cart/POS/Manual)

2. **Customer Analytics** - Total unique customers, new vs returning, Customer LTV distribution, top customers by lifetime value, top customers by order count, average orders per customer, customer city/region breakdown

3. **Product Performance** - Top selling products by quantity & revenue, least selling products, product category performance, stock-to-sales ratio, products never sold

4. **Inventory** - Current stock levels overview, low stock alerts, out-of-stock products, stock value (quantity × price), category-wise inventory distribution, stock movement (sold vs remaining)

5. **Marketing & UTM** - Revenue by UTM source/medium/campaign, conversion rates by source, visitor sessions over time, top referrers (reuse existing OrderAnalytics UTM logic)

### Technical Approach

**Files to create:**
- `src/pages/admin/AdminAnalytics.tsx` - Main page with tabs and global filters
- `src/components/admin/analytics/RevenueAnalytics.tsx` - Revenue & Orders tab
- `src/components/admin/analytics/CustomerAnalytics.tsx` - Customer LTV & insights
- `src/components/admin/analytics/ProductAnalytics.tsx` - Product performance
- `src/components/admin/analytics/InventoryAnalytics.tsx` - Stock overview
- `src/components/admin/analytics/MarketingAnalytics.tsx` - UTM & traffic

**Files to modify:**
- `src/App.tsx` - Add route `/admin/analytics`
- `src/components/admin/AdminSidebar.tsx` - Add "Analytics" nav item with `BarChart3` icon

**Data sources** - All from existing tables (no DB changes needed):
- `orders` + `order_items` for revenue, product sales, customer data
- `products` + `product_variants` for inventory
- `categories` for category breakdowns
- `visitor_sessions` for traffic/UTM data

**Libraries** - Existing `recharts` for all charts (BarChart, PieChart, LineChart, AreaChart)

**Responsive** - Uses the established admin layout patterns: `flex-col sm:flex-row` headers, responsive grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` for stat cards, scrollable tables on mobile.

