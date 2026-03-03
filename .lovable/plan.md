

## Issues Found

### 1. Shipping fees are hardcoded, ignoring admin settings
The checkout page hardcodes shipping fees at ৳60 (Inside Dhaka) and ৳120 (Outside Dhaka) on line 95, but the admin has configured them as ৳80 and ৳150 in `shipping_options` site settings. The UI also hardcodes these values on lines 777 and 786. This means orders are charged incorrect shipping.

### 2. OTP edge function uses HTTP (not HTTPS) for BulkSMSBD API
The `send-otp` function calls `http://bulksmsbd.net/api/smsapi` (line in edge function). Many environments block or delay plain HTTP requests. This could cause timeouts or failures, making OTP delivery unreliable.

### 3. OTP credentials sent from client-side (security + latency issue)
The OTP hook reads credentials from `site_settings` (publicly readable) and sends them in the request body to the edge function. This is both a security risk (API keys exposed to client) and adds latency since the client must first fetch settings, then send them. The edge function should read credentials from secrets or the database directly using the service role key.

### 4. send-sms function also uses HTTP
Same issue as send-otp -- `http://bulksmsbd.net` instead of HTTPS.

---

## Plan

### Task 1: Fix shipping fees to use admin-configured values
**File: `src/pages/Checkout.tsx`**
- Replace the hardcoded `shippingFee` calculation (line 95) to read from `settings.shipping_options`
- Update the UI display on lines 777 and 786 to show dynamic prices from settings
- Fall back to current hardcoded values if no shipping options are configured

### Task 2: Fix OTP edge function for reliability
**File: `supabase/functions/send-otp/index.ts`**
- Change `http://bulksmsbd.net` to `https://bulksmsbd.net`
- Change `http://api.revesms.com` to `https://api.revesms.com`
- Remove client-sent credentials from the request body; instead have the edge function read `bulksms_api_key`, `bulksms_sender_id` (and reve equivalents) from Supabase secrets or by querying `site_settings` with the service role key directly
- Add a timeout to the SMS API fetch call (e.g., 10 seconds) to prevent hanging

### Task 3: Update send-sms function similarly
**File: `supabase/functions/send-sms/index.ts`**
- Change `http://bulksmsbd.net` to `https://bulksmsbd.net`

### Task 4: Simplify OTP hook (client-side)
**File: `src/hooks/useOtpVerification.ts`**
- Stop sending SMS provider credentials in the `sendOtp` request body (only send `phone`, `session_id`, `otp_message_template`, `otp_expiry_minutes`)
- The edge function will handle credentials server-side

### Task 5: Redeploy edge functions
- Deploy updated `send-otp` and `send-sms` functions

