# Zero Integration — fixes applied to this ZIP

- Removed the middleware redirect that sent a signed-in admin from `/cart`, `/checkout`, and `/account` to `/admin/dashboard`. Admin routes remain protected; signed-in admins can now test storefront flows.
- Added a visible Light/Dark theme toggle to storefront and admin headers. Preference is saved in localStorage.
- Fixed the New Product form redirect: it no longer navigates away immediately before the form can be filled out; it redirects only after successful creation.
- Improved product image upload error handling so a Cloudinary configuration/upload failure is shown before the product is created, avoiding a misleading half-completed submission.
- Revalidates storefront paths after product creation.
- Extended the backup product importer to search supported backup JSON/image locations and to update existing backup image records safely.
- Revalidates customer order pages when an admin changes order status or tracking information.

## Before running

1. Keep your real `.env` file private in your local project; it is intentionally not included in this ZIP.
2. Install dependencies with `npm install`.
3. Confirm `DATABASE_URL`, Supabase settings, and Cloudinary settings are correct in your local `.env`. Cloudinary is needed if you upload images through the admin product form.
4. Test locally before deploying. I could inspect and patch the source ZIP here, but could not run a full Next.js build against your private database/environment in this session.

## Round 2 fixes
- Theme is applied before first paint (inline script in root layout), no white flash; tailwind darkMode set to "class".
- Order status badges (storefront) readable in light and dark; admin badges have dark variants.
- Error text (text-red-700) now lightens in dark mode; product low-stock note too.
- bg-white inputs now use bg-paper (removed .bg-white override in globals.css).
- Reset-password page styled for both themes, 8 char minimum (matches register), redirects to /login.
- auth/callback: `next` param only accepts same-site paths (open redirect fixed).
- Removed order-tracking-admin.zip from project, *.zip added to .gitignore.
- Added missing formatDate / formatDateTime to src/lib/format.ts (build was failing without them).
- Removed duplicate createClient import in login-form.tsx (build error).
- Product images copied into public/product-backup (DB points to /product-backup/*, was 404). Tab A11+ also saved as .jpg.
- Product page now has an image gallery with thumbnails (multiple images per product).
- Folder importer: backup-products/items/<product>/product.txt + many images; npm run db:backup-products (and :dry). See backup-products/README.txt
- Product images use object-contain (no cropping); gallery main image is square.
- Added Contact, Refund/Return (5 days), Shipping, Terms, Privacy pages + footer links. Edit name/contact in src/lib/site.ts
- Razorpay online payment added, COD removed from checkout. See RAZORPAY-SETUP.md

## Round 3
- DB: prisma.ts adds safe pool defaults to DATABASE_URL (pgbouncer for Neon -pooler host, 30s connect/pool timeout, connection_limit 5 prod/10 dev). Singleton kept.
- DB: stock adjust is now one atomic update (fewer queries inside transactions); checkout reads products in one query.
- Checkout: transaction maxWait 20s / timeout 60s (Serializable kept); cart is claimed first so double submit cannot create two orders; cart cleared only if the order commits.
- Razorpay: minimum Rs 1 checked before the order is created and before calling Razorpay; clear message; error from payment shown on the order page; order is never marked paid on failure.
- Expire job and admin order transaction have timeouts.
- Google sign-in: button on /login, callback handles errors/cancel, Google name used, admin rows cannot be claimed via Google. See GOOGLE-LOGIN-SETUP.md
- Importer: refuses a SKU/slug that belongs to a different product in the DB, and folders without images.
- New: npm run db:check (safe DB diagnosis, prints no secrets).
