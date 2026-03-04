

## Plan: Fix Invoice Currency, Alignment, and Add Logo

### Issues (from screenshot)
1. Currency shows as `৳` symbol — should show `BDT` text prefix
2. Content alignment/spacing needs improvement (address text wrapping, totals alignment)
3. No store logo in the invoice header

### Changes

**File: `src/components/admin/OrderInvoice.tsx`**

1. **Currency**: Change default from `'৳'` to `'BDT '` (with space). Format prices without `.00` decimals (use `.toFixed(0)` since BDT doesn't use decimals).

2. **Add Logo**: Accept `logo_url` in `InvoiceSettings`. If provided, load the image via `fetch` → base64, then place it top-left using `doc.addImage()`. Shift store name below the logo.

3. **Alignment/Spacing fixes**:
   - Increase left margin from 14 to 20 for better padding
   - Wrap long address lines using `maxWidth` parameter on `doc.text()`
   - Improve totals section spacing — align labels and values consistently
   - Add more vertical space between sections (Bill To, table, totals)

**File: `src/pages/admin/AdminOrders.tsx`**

4. Pass `logo_url` and `currency_symbol` from settings to `generateInvoice`:
   ```typescript
   generateInvoice(order, items || [], {
     store_name: settings.store_name,
     store_tagline: settings.store_tagline,
     logo_url: settings.logo_url,
     currency_symbol: 'BDT ',
   });
   ```

### Technical Detail: Logo Loading
Since jsPDF requires base64 image data, the logo URL will be fetched as a blob, converted to base64 via `FileReader`, then added with `doc.addImage()`. If the fetch fails (CORS, missing URL), the invoice still generates without a logo — graceful fallback.

