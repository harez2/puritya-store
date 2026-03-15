

## Invoice Customization System

### Overview
Two changes: (1) Add a total quantity summary row to the invoice table, and (2) build an admin Invoice Customization section where admins can toggle on/off each invoice element.

### Changes

**1. Add total quantity row to invoice (`OrderInvoice.tsx`)**
- After the items table body, add a summary row showing "Total Items" with the sum of all quantities.
- This appears as a bold footer row in the autoTable output.

**2. Create Invoice Settings UI (`InvoiceSettingsEditor.tsx`)**
- New component with toggles for each invoice element:
  - Show Logo / Store Name
  - Show Invoice Number
  - Show Date
  - Show Order Status
  - Show Payment Status
  - Show Bill To (customer info)
  - Show Payment Method
  - Show Items Table
  - Show Total Quantity Row
  - Show Subtotal
  - Show Shipping Fee
  - Show Total
  - Show Notes
  - Custom Footer Text (text input, e.g. "Thank you for your purchase!")
- Stored as `invoice_settings` key in `site_settings` table.

**3. Update `generateInvoice` to respect settings**
- Accept an optional `invoiceConfig` parameter with the toggle values.
- Conditionally render each section based on the config.
- Default all toggles to `true` for backward compatibility.

**4. Wire it up**
- Add the `InvoiceSettingsEditor` card to `AdminSettings.tsx`.
- Where `generateInvoice` is called, fetch `invoice_settings` from site settings and pass it through.

### Files
- **Edit**: `src/components/admin/OrderInvoice.tsx` — add total qty row + config-driven rendering
- **New**: `src/components/admin/InvoiceSettingsEditor.tsx` — admin UI for invoice customization
- **Edit**: `src/pages/admin/AdminSettings.tsx` — mount InvoiceSettingsEditor
- **Edit**: Wherever `generateInvoice` is called — pass invoice settings

