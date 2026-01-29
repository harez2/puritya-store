
# OTP Verification System for Order Placement

## Overview
This plan implements a phone-based OTP (One-Time Password) verification system that triggers during checkout. Customers must verify their phone number via SMS before completing their order. The system supports two SMS providers: **BulkSMSBD** (already integrated) and **Reve System** (new).

---

## Implementation Components

### 1. Database Schema
A new table to store OTP records with automatic expiration:

**Table: `otp_verifications`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| phone | text | Customer phone number |
| otp_code | text | 6-digit OTP code |
| expires_at | timestamp | Expiration time (5 minutes from creation) |
| verified | boolean | Whether OTP has been verified |
| attempts | integer | Failed verification attempts (max 3) |
| session_id | text | Browser session identifier |
| created_at | timestamp | Creation timestamp |

RLS Policies: Allow anonymous inserts for creating OTPs, allow reads based on phone/session matching.

---

### 2. OTP Edge Functions

**Function: `send-otp`**
- Generates a random 6-digit OTP
- Stores it in `otp_verifications` table with 5-minute expiry
- Sends SMS via the configured provider (BulkSMSBD or Reve System)
- Implements rate limiting (max 3 OTPs per phone per 10 minutes)

**Function: `verify-otp`**
- Validates the OTP code against stored record
- Checks expiration and attempt limits
- Marks as verified on success
- Returns verification status

---

### 3. Admin Panel - OTP Settings

Location: **Settings > SMS Notifications** (extend existing `SmsSettingsEditor.tsx`)

New configuration section:
- **Enable OTP Verification**: Master toggle for the feature
- **OTP Provider Selection**: Dropdown to choose between:
  - BulkSMSBD (uses existing integration)
  - Reve System (new integration)
- **Reve System Credentials** (shown when Reve System selected):
  - API Key
  - API Secret
  - Sender ID
- **OTP Message Template**: Customizable with `{otp}` placeholder
- **OTP Expiry Time**: Default 5 minutes

---

### 4. OTP Verification Modal Component

New component: `src/components/checkout/OtpVerificationModal.tsx`

**UI Flow:**
1. **Step 1 - Phone Entry**: Input field for phone number + "Send OTP" button
2. **Step 2 - OTP Entry**: 6-digit OTP input using existing `InputOTP` component
3. **Step 3 - Verified**: Success state with checkmark

**Features:**
- Countdown timer showing OTP expiry (5:00 remaining)
- "Resend OTP" button (enabled after 60 seconds)
- Error handling for invalid/expired OTPs
- Loading states during API calls

---

### 5. Checkout Flow Integration

**Files to modify:**
- `src/pages/Checkout.tsx`
- `src/components/checkout/QuickCheckoutModal.tsx`
- `src/contexts/CartContext.tsx` (for add-to-cart OTP if required)

**Integration Points:**
1. Before order submission, check if OTP is enabled in settings
2. If enabled and phone not yet verified in current session:
   - Open OTP verification modal
   - Block order submission until verified
3. Store verification status in session storage
4. Allow verified users to proceed with order

---

### 6. Site Settings Extension

Add to `SiteSettingsContext.tsx`:
```typescript
// OTP Settings
otp_verification_enabled: boolean;
otp_provider: 'bulksmsbd' | 'reve_system';
otp_message_template: string;
otp_expiry_minutes: number;
reve_api_key: string;
reve_api_secret: string;
reve_sender_id: string;
```

---

## User Experience Flow

```
Customer clicks "Place Order"
           │
           ▼
   ┌───────────────────┐
   │ OTP Enabled?      │
   └───────────────────┘
           │
    Yes    │    No
           │     └──────► Proceed to order
           ▼
   ┌───────────────────┐
   │ Phone Verified    │
   │ in this session?  │
   └───────────────────┘
           │
    Yes    │    No
           │     │
           │     ▼
           │  ┌─────────────────────┐
           │  │ Show OTP Modal      │
           │  │ 1. Enter phone      │
           │  │ 2. Receive SMS      │
           │  │ 3. Enter OTP code   │
           │  └─────────────────────┘
           │           │
           │           ▼
           │  ┌─────────────────────┐
           │  │ Verification        │
           │  │ Success/Failure     │
           │  └─────────────────────┘
           │           │
           └───────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Create Order    │
              └─────────────────┘
```

---

## Technical Details

### SMS Provider Implementations

**BulkSMSBD** (existing):
- API Endpoint: `http://bulksmsbd.net/api/smsapi`
- Already configured with existing credentials

**Reve System** (new):
- API Endpoint: `https://api.revesms.com/send-sms` (typical format)
- Requires: API Key, API Secret, Sender ID
- Will be added as alternative provider

### Security Measures
- OTPs expire after 5 minutes
- Maximum 3 verification attempts per OTP
- Rate limiting: 3 OTP requests per phone number per 10 minutes
- Session-based verification tracking
- Phone number validation (Bangladesh format)

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-otp/index.ts` | Edge function to generate and send OTP |
| `supabase/functions/verify-otp/index.ts` | Edge function to validate OTP |
| `src/components/checkout/OtpVerificationModal.tsx` | OTP verification UI modal |
| `src/hooks/useOtpVerification.ts` | Hook for OTP verification state management |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add new edge functions |
| `src/components/admin/SmsSettingsEditor.tsx` | Add OTP provider configuration section |
| `src/contexts/SiteSettingsContext.tsx` | Add OTP-related settings |
| `src/pages/Checkout.tsx` | Integrate OTP verification before order |
| `src/components/checkout/QuickCheckoutModal.tsx` | Integrate OTP verification before quick order |

## Database Migration

Create `otp_verifications` table with appropriate RLS policies for anonymous access during checkout.
