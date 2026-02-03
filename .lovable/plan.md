
# Fix: Variable Product Add-to-Cart Behavior

## Problem
When clicking "Add to Cart" from product listings (homepage sections, shop page, category pages), all products are added directly to cart regardless of whether they have size/color variants. Variable products should redirect users to the product detail page first to select their preferred options.

## Solution
Modify the `ProductCard` component to detect if a product has variants (sizes or colors) and change the button behavior accordingly:

- **Simple products** (no sizes AND no colors): Add directly to cart
- **Variable products** (has sizes OR has colors): Navigate to product detail page

## Implementation

### File: `src/components/products/ProductCard.tsx`

**Changes:**

1. Import `useNavigate` from `react-router-dom`
2. Add a helper check: `const hasVariants = (product.sizes?.length > 0) || (product.colors?.length > 0)`
3. Update the button click handler to:
   - If `hasVariants` is true: navigate to `/product/${product.slug}`
   - If `hasVariants` is false: call `addToCart(product.id)`
4. Update button text to show "Select Options" for variable products

### Code Changes Overview

```typescript
// Add navigate hook
const navigate = useNavigate();

// Check if product has variants
const hasVariants = (product.sizes?.length ?? 0) > 0 || (product.colors?.length ?? 0) > 0;

// Update button onClick handler
onClick={(e) => {
  e.preventDefault();
  if (hasVariants) {
    navigate(`/product/${product.slug}`);
  } else {
    addToCart(product.id);
  }
}}

// Update button text
{product.in_stock 
  ? (hasVariants ? 'Select Options' : 'Add to Cart') 
  : 'Sold Out'}
```

## Result
- Simple products will be added to cart immediately from product listings
- Variable products will redirect to the product page where customers can choose size/color before adding to cart
- Provides a better user experience by ensuring customers always select their preferred variant
