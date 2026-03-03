

## Plan: Make Product Page Delivery Banner Configurable

### Problem
The delivery info text ("🚚 Free delivery on orders over ৳5,000 • Cash on Delivery available") on the product detail page is hardcoded. No way to toggle it off or change the content.

### Changes

#### 1. Add settings fields (`SiteSettingsContext.tsx`)
- `product_delivery_banner_enabled: boolean` (default `true`)
- `product_delivery_banner_text: string` (default `🚚 Free delivery on orders over ৳5,000 • Cash on Delivery available`)

#### 2. Add admin controls (`AdminSettings.tsx`)
Under the Product Options card, add:
- Toggle: "Show Delivery Info Banner" to enable/disable
- Text input (when enabled): editable banner text

#### 3. Update product page (`ProductDetail.tsx`, ~line 498)
- Read settings; conditionally render the banner
- Display the custom text instead of the hardcoded string

