

## Admin Order SMS Notifications — Multi-Number + Custom Template

### Current State
- There's already a realtime listener (`useNewOrderNotification`) that triggers on new orders and can send SMS to a single `adminPhone`.
- The admin settings UI has a single phone input field when SMS is enabled.
- The SMS message is hardcoded: `"New order #... received! Total: ৳... Customer: ..."`.

### Changes

**1. Support multiple admin phone numbers (`AdminSettings.tsx` + `useNewOrderNotification.ts`)**
- Change `adminPhone: string` to `adminPhones: string[]` in the `NotificationSettings` interface (keep backward compat with old `adminPhone`).
- Replace the single Input with a multi-phone UI: a list of phone numbers with add/remove buttons.
- In `useNewOrderNotification.ts`, loop over all phone numbers and send SMS to each.

**2. Add customizable admin notification SMS template (`AdminSettings.tsx` + `useNewOrderNotification.ts`)**
- Add `adminSmsTemplate: string` to `NotificationSettings`.
- Default: `"New order #{order_number} received! Total: ৳{total}. Customer: {customer_name}"`.
- Add a Textarea in the notification settings UI with placeholder tags listed below it (`{order_number}`, `{total}`, `{customer_name}`, `{phone}`, `{address}`).
- In `sendAdminSms()`, use the custom template instead of the hardcoded message, replacing placeholders with order data.

**3. Backward compatibility**
- When loading settings, if old `adminPhone` (string) exists but `adminPhones` (array) doesn't, migrate it into `adminPhones: [adminPhone]`.

### Files to Modify
- `src/pages/admin/AdminSettings.tsx` — update interface, UI for multiple phones + template textarea
- `src/hooks/useNewOrderNotification.ts` — update interface, loop over phones, use custom template

