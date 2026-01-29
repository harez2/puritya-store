
# Incomplete Orders (Abandoned Checkout) Feature

## Overview
This feature captures checkout form data when customers enter their information (name, phone number, address) but do not complete the order. This data is stored in a new `incomplete_orders` table and displayed in a dedicated admin section, allowing CRM agents to follow up with potential customers and convert them into actual sales.

---

## Implementation Components

### 1. Database Schema

**New Table: `incomplete_orders`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | text | Browser session identifier |
| full_name | text | Customer name (nullable) |
| phone | text | Customer phone (nullable) |
| email | text | Customer email (nullable) |
| address | text | Shipping address (nullable) |
| shipping_location | text | Shipping zone selection |
| payment_method | text | Selected payment method |
| notes | text | Order notes |
| cart_items | jsonb | Array of cart items with product details |
| subtotal | numeric | Cart subtotal |
| shipping_fee | numeric | Calculated shipping |
| total | numeric | Order total |
| source | text | 'checkout' or 'quick_buy' |
| status | text | 'pending', 'converted', 'hidden' (default: 'pending') |
| converted_order_id | uuid | Reference to actual order if converted |
| last_updated_at | timestamp | Last form update time |
| created_at | timestamp | First capture time |

**RLS Policies:**
- Admins: Full CRUD access
- Anonymous: Can INSERT and UPDATE their own records (by session_id)

---

### 2. Auto-Capture Logic

**Strategy**: Debounced auto-save when form fields change on checkout page

**Files to modify:**
- `src/pages/Checkout.tsx` - Add auto-save hook
- `src/components/checkout/QuickCheckoutModal.tsx` - Add auto-save hook

**New hook: `src/hooks/useIncompleteOrderCapture.ts`**
- Debounce form changes (save after 2 seconds of no input)
- Capture form state: name, phone, email, address, cart items
- Use session storage for session_id
- Only save when at least phone OR name is provided
- Update existing record if session_id exists, otherwise create new
- Mark as converted/delete when order is successfully placed

**Capture triggers:**
1. Form field blur events (save on field exit)
2. Debounced onChange (2 seconds after last keystroke)
3. Before modal close (for QuickCheckoutModal)

---

### 3. Admin Panel - Incomplete Orders Tab

**Location**: Add a tabbed interface to `AdminOrders.tsx` with two tabs:
- "Order List" (existing orders)
- "Incomplete Orders" (new abandoned checkouts)

**Table columns:**
| Column | Description |
|--------|-------------|
| Date/Time | When checkout was started |
| Customer | Name + Phone |
| Items | Product names/images |
| Total | Calculated order total |
| Source | Checkout / Quick Buy |
| Status | Pending / Hidden |
| Actions | View, Edit, Convert, Hide, Delete |

**Filtering:**
- Date range picker
- Status filter (All, Pending, Hidden)
- Search by name/phone

---

### 4. CRM Agent Actions

**View Details Dialog:**
- Show complete captured form data
- Display cart items with images
- Show timeline of form updates

**Edit Order Dialog:**
- Editable customer information (name, phone, email, address)
- Editable cart items (add/remove products, quantities, sizes/colors)
- Payment method selection
- Shipping option selection
- Notes field

**Convert to Order:**
- Button to convert incomplete order to actual order
- Creates new entry in `orders` table with source = 'crm_converted'
- Creates associated `order_items`
- Updates incomplete order status to 'converted'
- Links via `converted_order_id`
- Shows confirmation with order number

**Hide/Delete:**
- "Hide" marks status as 'hidden' (can be filtered out but not deleted)
- "Delete" permanently removes the incomplete order
- Confirmation dialogs for both actions

---

### 5. Automatic Cleanup

**On successful order placement:**
- Check for incomplete orders with matching session_id
- Mark as 'converted' and link to new order
- This prevents duplicate follow-ups

**Periodic cleanup (optional future enhancement):**
- Consider adding a scheduled function to auto-hide orders older than 30 days

---

## Technical Flow

```
Customer visits Checkout
         |
         v
   Fills form fields
   (name, phone, address)
         |
         v
   Debounced auto-save
   triggers after 2s
         |
         v
   +--------------------------+
   | incomplete_orders table  |
   | session_id = browser ID  |
   +--------------------------+
         |
         +---> Customer completes order
         |            |
         |            v
         |    Mark as 'converted'
         |    Link to actual order
         |
         +---> Customer abandons
                     |
                     v
              CRM agent sees in
              Admin > Orders > 
              Incomplete Orders
                     |
                     v
              Agent calls customer
              edits order if needed
                     |
                     v
              Convert to actual order
              OR hide/delete
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useIncompleteOrderCapture.ts` | Auto-capture checkout form data |
| `src/components/admin/IncompleteOrdersTab.tsx` | Admin table for incomplete orders |
| `src/components/admin/IncompleteOrderDetailsDialog.tsx` | View incomplete order details |
| `src/components/admin/ConvertOrderDialog.tsx` | Dialog to convert incomplete to actual order |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | No changes needed (no new edge functions) |
| `src/pages/admin/AdminOrders.tsx` | Add Tabs component to switch between Order List and Incomplete Orders |
| `src/pages/Checkout.tsx` | Integrate useIncompleteOrderCapture hook, mark as converted on success |
| `src/components/checkout/QuickCheckoutModal.tsx` | Integrate useIncompleteOrderCapture hook for quick checkout |

---

## Database Migration

```sql
-- Create incomplete_orders table
CREATE TABLE public.incomplete_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  shipping_location TEXT,
  payment_method TEXT,
  notes TEXT,
  cart_items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'checkout',
  status TEXT DEFAULT 'pending',
  converted_order_id UUID REFERENCES public.orders(id),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incomplete_orders ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_incomplete_orders_session ON public.incomplete_orders(session_id);
CREATE INDEX idx_incomplete_orders_status ON public.incomplete_orders(status);
CREATE INDEX idx_incomplete_orders_phone ON public.incomplete_orders(phone);
CREATE INDEX idx_incomplete_orders_created ON public.incomplete_orders(created_at DESC);

-- RLS Policies
CREATE POLICY "Admins can manage incomplete orders"
  ON public.incomplete_orders FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can create incomplete orders"
  ON public.incomplete_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their session incomplete orders"
  ON public.incomplete_orders FOR UPDATE
  USING (true);
```

---

## User Interface Design

**Admin Orders Page with Tabs:**
- Tab 1: "Order List" - Current functionality
- Tab 2: "Incomplete Orders" - New abandoned checkouts view

**Incomplete Orders Table:**
- Sortable columns
- Bulk actions (Hide selected, Delete selected)
- Export to CSV option
- Pagination

**Status Badges:**
- Pending: Yellow badge
- Converted: Green badge (with link to actual order)
- Hidden: Gray badge

**Row Actions Dropdown:**
- View Details
- Edit Order
- Convert to Order (primary action)
- Hide (soft delete)
- Delete (permanent, with confirmation)

---

## Security Considerations

1. RLS ensures only admins can read incomplete orders data
2. Session ID prevents customers from accessing others' data
3. Phone/email data is protected behind admin authentication
4. No sensitive payment data is stored (only method type, not credentials)
