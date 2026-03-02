

## Steadfast Courier Integration

### Overview
Integrate Steadfast Courier API into the admin order management so admins can send pickup requests, track deliveries, and auto-update order statuses — all from the order list.

### Steadfast API Summary
- **Base URL**: `https://portal.packzy.com/api/v1`
- **Auth**: `Api-Key` and `Secret-Key` headers
- **Create Order**: `POST /create_order` — params: `invoice`, `recipient_name`, `recipient_phone`, `recipient_address`, `cod_amount`, `note`
- **Response**: Returns `consignment_id`, `tracking_code`, `status`
- **Check Status**: `GET /status_by_cid/{consignment_id}` or `/status_by_trackingcode/{tracking_code}`
- **Tracking URL**: `https://steadfast.com.bd/t/{tracking_code}`

### Database Changes

Add columns to the `orders` table to store courier data:
- `courier_name` (text, nullable) — e.g. "steadfast"
- `courier_consignment_id` (text, nullable)
- `courier_tracking_code` (text, nullable)
- `courier_tracking_url` (text, nullable)
- `courier_status` (text, nullable) — raw status from courier

### Edge Function: `steadfast-courier`

A new edge function handling three operations:
1. **`create_order`** — Takes an order ID, fetches order + items from DB, calls Steadfast API to create consignment, saves tracking info back to the order, updates order status to "processing"
2. **`check_status`** — Takes an order ID, queries Steadfast by consignment_id, returns current delivery status, updates `courier_status` and optionally the order `status` (e.g. "delivered")
3. **`check_balance`** — Returns current Steadfast account balance

Requires two secrets: `STEADFAST_API_KEY` and `STEADFAST_SECRET_KEY`.

### Admin UI Changes

**Order list table** (`AdminOrders.tsx`):
- Add a "Send to Courier" button/action in the order dropdown menu (only for orders without a consignment)
- Show courier tracking code as a clickable link in the order row or details view
- Add a "Sync Courier Status" action for orders already sent to Steadfast
- Add bulk "Send to Courier" for selected orders

**Order details dialog**:
- Show courier section with tracking code link, consignment ID, courier status
- "Send to Courier" button if not yet sent

**Invoice** (if PDF generation exists):
- Include courier tracking URL in the order invoice

### Automatic Status Mapping
Map Steadfast statuses to order statuses:
- `in_review` / `pending` → "processing"
- `delivered` → "delivered"
- `partial_delivered` → "delivered"
- `cancelled` / `hold` → keep current or flag

### Files to Create
- `supabase/functions/steadfast-courier/index.ts`

### Files to Modify
- `src/pages/admin/AdminOrders.tsx` — add courier actions, tracking display
- `supabase/config.toml` — register new function

### Secrets Required
- `STEADFAST_API_KEY`
- `STEADFAST_SECRET_KEY`

