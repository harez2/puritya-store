

## Plan: Add Custom Product Item for Manual Orders

### Problem
Admins need to add ad-hoc items (custom customer demands) to manual orders and when editing existing orders. These items have no corresponding product in the catalog and should not appear on the storefront.

### Approach
No database changes needed -- `order_items.product_id` is already nullable. Custom items will be stored as regular order items with `product_id = null` and a custom name/price. The invoice already renders `product_name` from order items, so custom items will appear correctly there automatically.

### Changes

**1. `src/pages/admin/AdminPOS.tsx`**
- Add a "Custom Item" button in the cart/right panel
- When clicked, show inline fields: Item Name, Unit Price, Quantity
- Add to `orderItems` with a fake product object (id = `custom-{timestamp}`) or restructure the OrderItem interface to support custom items
- On submit, insert with `product_id: null` and the custom name/price

**2. `src/components/admin/ManualOrderDialog.tsx`**
- Add a "Custom Item" button alongside the product search
- Show inline form: name, price, quantity
- Custom items added to orderItems with `product_id: null`

**3. `src/components/admin/EditOrderDialog.tsx`**
- Add a "Custom Item" button next to "Add Product"
- Same inline form for name, price, quantity
- Custom items saved with `product_id: null`
- Existing custom items (product_id is null) should render with an editable name/price

### How it works for the user
- In POS, Manual Order, or Edit Order, the admin clicks "Add Custom Item"
- Enters a name (e.g., "Custom embroidery service"), price, and quantity
- The item appears in the order like any other product
- On the invoice PDF, it shows the custom item name and pricing
- These items never appear on the storefront since they are not in the products table

