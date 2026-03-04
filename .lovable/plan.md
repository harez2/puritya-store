

## New Order Notification System

### Overview
Implement a real-time notification system that alerts admins when new orders arrive, using three channels: browser push notifications, SMS, and an in-dashboard sound alert.

### Technical Approach

**1. Enable Realtime on the `orders` table**
- Add `orders` to the `supabase_realtime` publication via a migration so Postgres changes are broadcast.

**2. Create a `useNewOrderNotification` hook**
- Subscribe to `postgres_changes` on `orders` table for `INSERT` events.
- On new order:
  - **Sound alert**: Play a notification sound (use a short audio file or the Web Audio API to generate a beep).
  - **Browser notification**: Use the `Notification` API (`Notification.requestPermission()` on mount, then `new Notification(...)` on event).
  - **SMS**: Call the existing `sendOrderSms` logic but send to the admin's configured phone number instead of the customer. Fetch the admin notification phone from `site_settings` (key: `admin_notification_settings`).
- Show a sonner toast in the admin panel as well.

**3. Add Admin Notification Settings UI**
- In `AdminSettings.tsx`, add a section for "Order Notifications" with:
  - Toggle: Enable/disable new order notifications
  - Admin phone number input (for SMS alerts)
  - Toggle: Enable/disable sound
  - Toggle: Enable/disable browser notifications
  - Toggle: Enable/disable SMS notifications
- Store as a `site_settings` row with key `admin_notification_settings`.

**4. Integrate the hook into `AdminLayout`**
- Call `useNewOrderNotification()` inside `AdminLayout` so it runs on every admin page.
- Request browser notification permission on first load.

### Files to Create/Modify
- **New**: `src/hooks/useNewOrderNotification.ts` — realtime subscription + notification logic
- **Migration**: Enable realtime on `orders` table
- **Edit**: `src/components/admin/AdminLayout.tsx` — mount the hook
- **Edit**: `src/pages/admin/AdminSettings.tsx` — add notification settings section

### Notification Content
- Sound: Short chime/beep via Web Audio API (no external audio file needed)
- Browser: Title "New Order!", body with order number and total
- SMS: "New order #{order_number} received! Total: ৳{total}. Customer: {customer_name}"

