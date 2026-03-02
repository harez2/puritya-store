

## Issues & Plan

### 1. Product Deletion Bug (Fix)

**Root cause:** The `order_items` table has a foreign key `order_items_product_id_fkey` referencing `products(id)` **without** `ON DELETE CASCADE`. When you try to delete a product that has been ordered, the database rejects it with a foreign key violation.

**Fix:** Run a migration to change the FK to `ON DELETE SET NULL`, making `product_id` nullable. This preserves order history (product name/image are already stored in order_items) while allowing the product to be deleted.

Migration:
- Alter `order_items.product_id` to be nullable
- Drop the existing FK and recreate it with `ON DELETE SET NULL`

### 2. Order Soft-Delete with Trash (New Feature)

**Database changes:**
- Add `deleted_at` (timestamptz, nullable) column to the `orders` table
- Create a cron job (pg_cron + pg_net) to permanently delete orders where `deleted_at` is older than 30 days

**Admin UI changes in `AdminOrders.tsx`:**
- Add a "Trash" tab alongside the existing Orders/Incomplete Orders tabs
- Add delete button to order actions dropdown menu (moves order to trash by setting `deleted_at = now()`)
- Trash tab shows soft-deleted orders with options to restore or permanently delete
- Bulk delete support for selected orders
- Filter `fetchOrders()` to exclude trashed orders (`deleted_at IS NULL`)
- Trash tab fetches orders where `deleted_at IS NOT NULL`
- Add "Empty Trash" button to permanently delete all trashed orders
- Update RLS: admins can delete orders (add DELETE policy)

### Technical Details

**Migration SQL:**
1. Make `order_items.product_id` nullable + change FK to `ON DELETE SET NULL`
2. Add `deleted_at` column to `orders`
3. Add DELETE RLS policy on `orders` for admins
4. Set up `incomplete_orders.converted_order_id` FK to `ON DELETE SET NULL`

**Files to modify:**
- `src/pages/admin/AdminOrders.tsx` — Add trash tab, delete actions, restore functionality
- Database migration for schema changes

**Cron job:** Use `pg_cron` to schedule daily cleanup of orders trashed more than 30 days ago.

