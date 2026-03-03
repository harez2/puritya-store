

## Plan: Add Invoice View/Print/Download to Order List

### Overview
Add a "View Invoice" option to each order's action dropdown menu that generates a printable PDF invoice using the already-installed `jspdf` and `jspdf-autotable` libraries.

### Changes

#### 1. Create Invoice Generator Component
**New file: `src/components/admin/OrderInvoice.tsx`**
- A utility function `generateInvoice(order, orderItems, settings)` that builds a PDF using jsPDF:
  - Store name/logo from `SiteSettings`
  - Invoice number (order_number), date
  - Customer name, phone, address from `shipping_address`
  - Items table: product name, size/color, qty, unit price, line total
  - Subtotal, shipping fee, total
  - Payment method, payment status
  - Notes (if any)
- Opens in a new tab for print or triggers download

#### 2. Update AdminOrders — Add Dropdown Menu Item
**File: `src/pages/admin/AdminOrders.tsx`**
- Import `FileText` icon (already imported) and the invoice generator
- Add a `handleViewInvoice(order)` function that fetches order items (if not already loaded) then calls `generateInvoice`
- Add "View Invoice" `DropdownMenuItem` in the actions dropdown, between "Edit Order" and the courier separator (around line 1110)

### Technical Details
- Uses `jspdf` + `jspdf-autotable` (both already installed)
- Reads store branding (name, tagline) from `useSiteSettings` for the invoice header
- Fetches order items on-demand before generating the PDF
- PDF opens in a new browser tab (user can print or save from there)

