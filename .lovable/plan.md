

## Plan: Client-Side Image Optimization with WebP Conversion

### Problem
Product images are uploaded in their original format (PNG, JPEG, etc.) without any optimization, causing slow page loads.

### Solution
Create a shared utility function that uses the browser's Canvas API to:
1. Resize images to a max dimension (e.g., 1920px) while maintaining aspect ratio
2. Convert all images to WebP format with configurable quality (0.85 default — visually lossless)
3. Apply this optimization in all three upload components before uploading to storage

### Technical Details

**New file: `src/lib/image-optimizer.ts`**
- `optimizeImage(file: File, options?)` → returns optimized `File` as WebP
- Uses `createImageBitmap` + `OffscreenCanvas` (or regular Canvas fallback) to resize and convert
- Options: `maxWidth` (1920), `maxHeight` (1920), `quality` (0.85)
- Output filename changes extension to `.webp`

**Modified files:**
1. **`src/components/admin/ProductImageUpload.tsx`**
   - Import `optimizeImage`, call it on each file before `uploadImage()`
   - Change file extension in `uploadImage` to always use `.webp`

2. **`src/components/admin/SingleImageUpload.tsx`**
   - Same pattern — optimize before upload

3. **`src/components/admin/PopupImageUpload.tsx`**
   - Same pattern — optimize before upload

All three upload components will process images client-side before uploading, so no backend changes are needed. The Canvas `toBlob('image/webp', quality)` API handles both conversion and compression natively in the browser.

