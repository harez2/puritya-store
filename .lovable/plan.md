

## Completed

All items from the previous plan have been implemented:

1. ✅ Product deletion FK fix — `order_items.product_id` is now nullable with `ON DELETE SET NULL`
2. ✅ Order soft-delete with Trash tab — orders can be moved to trash, restored, or permanently deleted
3. ✅ Bulk trash operations — select multiple orders to trash, restore, or permanently delete
4. ✅ 30-day auto-cleanup cron job — runs daily at 3 AM to permanently delete orders trashed 30+ days ago
5. ✅ RLS policies — admin DELETE policies added for orders, order_status_history, payment_status_history
