

## SMS Campaign Launcher — Plan

### Overview
Build a full SMS campaign management system in the admin panel: create/send campaigns (bulk or single), segment customers by location/order value/lifetime value, track campaign status, and download reports.

### New Database Tables

**1. `sms_campaigns`** — stores each campaign
- `id`, `name`, `message`, `status` (draft/sending/completed/failed), `total_recipients`, `sent_count`, `failed_count`, `delivered_count`, `segment_filters` (jsonb — stores filter criteria), `created_by` (uuid), `scheduled_at`, `started_at`, `completed_at`, `created_at`, `updated_at`
- RLS: admin-only CRUD

**2. `sms_campaign_recipients`** — individual send log per recipient
- `id`, `campaign_id` (FK), `phone`, `customer_name`, `status` (pending/sent/failed/delivered), `error_message`, `sent_at`, `created_at`
- RLS: admin-only read/write

### New Edge Function

**`send-sms-campaign/index.ts`** — receives `campaign_id`, fetches recipients in `pending` status, sends SMS via BulkSMSBD (using stored API credentials from `sms_settings`), updates each recipient status, and updates campaign aggregates (`sent_count`, `failed_count`). Processes in batches to avoid timeouts.

### New Admin Page

**`src/pages/admin/AdminSmsCampaigns.tsx`** — main page with tabs:

1. **Campaigns List** — table of all campaigns with status badges, recipient counts, dates, actions (view/delete)
2. **Create Campaign** — form with:
   - Campaign name, message textarea with placeholder support (`{customer_name}`)
   - **Customer Segmentation Filters:**
     - Delivery location (city extracted from `orders.shipping_address->>'city'`)
     - Min/Max average order value
     - Min/Max lifetime value (total spend)
     - Option to select individual customers or "All customers"
   - Preview matching customer count before sending
   - Send now or schedule
3. **Campaign Detail/Report** — shows per-recipient delivery status, sent/failed/delivered counts, allows CSV download of the report

### Customer Segmentation Query
Query `orders` table grouped by `shipping_address->>'phone'`, computing:
- `SUM(total)` as lifetime value
- `AVG(total)` as average order value  
- `shipping_address->>'city'` for location filtering
- Join with customer phone numbers to build recipient list

This will be done via a database function `get_campaign_recipients(filters jsonb)` that returns matching phone numbers + names.

### Sidebar & Routing
- Add "SMS Campaigns" nav item with `MessageSquare` icon to `AdminSidebar.tsx`
- Add route `/admin/sms-campaigns` in `App.tsx`

### Report Download
- CSV export of campaign recipients with columns: Name, Phone, Status, Sent At, Error
- Filterable by status (sent/failed/delivered)

### Files to Create
- `src/pages/admin/AdminSmsCampaigns.tsx` — main page (list + create + detail views)
- `supabase/functions/send-sms-campaign/index.ts` — edge function for batch sending
- Migration for `sms_campaigns` + `sms_campaign_recipients` tables + `get_campaign_recipients` function

### Files to Modify
- `src/App.tsx` — add route
- `src/components/admin/AdminSidebar.tsx` — add nav item
- `supabase/config.toml` — register new edge function

