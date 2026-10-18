HOW TO ADD PRODUCTS (folder method)

1. Make one folder per product inside backup-products/items/
   Example: backup-products/items/samsung-s25-fe-navy/
2. Put product.txt in it (copy backup-products/items/_example-product/product.txt)
3. Put ALL images of that product in the same folder (jpg, png, webp).
   Images are shown in file-name order, the first one is the main image.
   Tip: name them 1.jpg, 2.jpg, 3.jpg
4. Check first (writes nothing):   npm run db:backup-products:dry
5. Import:                         npm run db:backup-products

Rules
- Folders starting with _ are skipped.
- Same sku again = product is updated, its folder images are replaced.
- Required in product.txt: sku, name, category, mrp, price, description
- Optional: highlights (bullet points separated by |, example: highlights: Noise cancelling | 30h battery | IPX4), slug, brand, stock, low_stock, discount, featured (yes/no), active (yes/no)
- Redeploy the website after importing so the new images in public/product-backup go live.
- Keep .env private. Back up the database before big imports.
