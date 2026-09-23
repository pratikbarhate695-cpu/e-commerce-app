# Phase 1 — Project Setup, Schema, Auth, Seed Admin

## What's in this phase

- Next.js 14 App Router + TypeScript + Tailwind, folder structure from Phase 0.
- Full Prisma schema (`prisma/schema.prisma`) — every model from the Phase 0 plan.
- Auth.js v5 (Credentials + Prisma adapter), split into:
  - `src/lib/auth.config.ts` — edge-safe, used by `middleware.ts`.
  - `src/lib/auth.ts` — full instance with Prisma + bcrypt, used everywhere else.
- `middleware.ts` gates `/admin/*`, `/account/*`, `/api/admin/*` at the edge.
- `src/lib/actions/require-admin.ts` — every admin action/route also re-checks
  the session independently. Middleware alone is not trusted (see the code
  comment referencing CVE-2025-29927, a documented middleware-bypass class of
  bug in Next.js).
- Two separate login surfaces: `/login` (customer) and `/admin/login`
  (rejects any non-ADMIN user and signs them back out — visiting the wrong
  URL never cross-authenticates).
- Registration, forgot-password, reset-password flows with hashed,
  time-limited tokens and Resend for delivery.
- `prisma/seed.ts` — creates the first admin from `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` in `.env`, hashed with bcrypt; the plaintext value is only
  ever read once, at seed time.
- Netlify config (`netlify.toml`) using the official `@netlify/plugin-nextjs`.

## Setup

This was built in a sandbox with no network access, so dependencies aren't
installed yet. Run these locally:

```bash
cd ecommerce-app
npm install

cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, RESEND_API_KEY

npx auth secret   # writes AUTH_SECRET into .env for you, if you skipped it above

npm run db:push   # creates tables from the schema (use db:migrate instead if you want migration files)
npm run db:seed   # creates the first admin account

npm run dev
```

Then:
- `http://localhost:3000` — storefront
- `http://localhost:3000/login` / `/register` — customer auth
- `http://localhost:3000/admin/login` — admin auth (use `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`)

## Verifying the security boundary

- Log in as a customer, then visit `/admin/dashboard` directly → redirected
  to `/admin/login` (middleware), and even if that redirect were bypassed,
  `requireAdmin()` in the page itself throws.
- Log in at `/admin/login` with a customer's credentials → rejected with
  "This account does not have admin access," and the session is signed back
  out — it does not leave you logged in as that customer either.

## Not in this phase

Catalog browsing, cart, checkout, pricing/coupon math, and the admin CRUD
panels are Phase 2 and Phase 3 per the Phase 0 plan — this phase is the
foundation those build on.

---

# Phase 2 — Catalog, Cart, Checkout

## What's new

- `src/lib/pricing.ts` — the single source of truth for money math. Every
  line is priced from the product's current `sellingPrice` in the DB, never
  from a client-supplied number. Handles discounts, coupon validation
  (active window, usage limits, min order value, max discount cap),
  shipping (with free-shipping threshold), and tax.
- `src/lib/inventory.ts` — `adjustStock()`, always called inside a
  transaction, always writes an `InventoryHistory` row.
- `src/lib/actions/checkout.ts` — `placeOrder()` runs everything in one
  **Serializable** Prisma transaction: re-checks stock against live rows,
  decrements it, creates the `Order` + `OrderItem` snapshots + a `Payment`
  row + `OrderStatusHistory`, applies the coupon usage, and empties the
  cart — all or nothing. Two shoppers racing for the last unit can't both
  succeed; the loser gets a clear "please try again" instead of an
  oversold order.
- Storefront pages: `/`, `/shop`, `/category/[slug]`, `/search`,
  `/product/[slug]`, `/cart`, `/checkout`, `/account/orders`,
  `/account/orders/[id]`.
- `/cart` and `/checkout` are now gated the same way as `/account` (cart is
  1:1 with a logged-in user in the schema), so both middleware and the page
  itself require a session.
- `prisma/seed.ts` now also seeds a "Bags" category, three sample products
  (placeholder images from Cloudinary's public demo cloud — swap for real
  product photos in Phase 3), and a `WELCOME10` coupon (10% off, ₹500
  minimum).

## Try it

After `npm run db:push && npm run db:seed`:
- `/shop` — full catalog
- `/product/rolltop-backpack` — low-stock example (3 in stock)
- Add items to cart (requires login), go to `/cart` → `/checkout`
- At checkout, try coupon code `WELCOME10`
- Try adding more of the rolltop backpack than the 3 in stock — the pricing
  layer rejects it before checkout ever touches the database

## Not in this phase

Admin CRUD panels (products, orders, inventory, coupons, banners,
settings), real payment processing (Payments are recorded as `CREATED`
placeholders — no gateway is wired up yet), and product image upload via
Cloudinary are Phase 3.

---

# Phase 3 — Admin Panels, Cloudinary Image Upload

## What's new

- **Products** (`/admin/products`) — list with search and low-stock flags,
  create/edit forms, activate/deactivate (products are never hard-deleted
  once they could be referenced by an order — same rule as Phase 0).
  Stock is intentionally **not** editable from the product form; it only
  changes through Inventory, so every change is audited.
- **Categories** (`/admin/categories`) — list + create, with parent
  category support. Deletion is blocked if a category still has products
  or subcategories.
- **Orders** (`/admin/orders`) — list with status filter chips, detail
  view with items/totals/shipping address/payment/history, and a status
  update form. `src/lib/actions/admin/orders.ts` enforces a status state
  machine (e.g. you can't move a `DELIVERED` order back to `PENDING`) and
  **automatically restocks** items — through the same audited
  `adjustStock()` helper as everything else — when an order is cancelled
  or refunded.
- **Customers** (`/admin/customers`) — list with order count and lifetime
  spend (cancelled orders excluded from the total).
- **Inventory** (`/admin/inventory`) — stock table with low/out-of-stock
  badges, a manual adjustment form (new stock, adjustment, damaged,
  returned), and a recent-changes log pulled from `InventoryHistory`.
- **Coupons** (`/admin/coupons`) — list + create, activate/deactivate.
- **Banners** (`/admin/banners`) — list + create with image upload,
  activate/deactivate. The homepage now actually renders active banners.
- **Settings** (`/admin/settings`) — edit `StoreSettings` (currency,
  shipping fee, free-shipping threshold, tax rate, contact info).
- **Cloudinary image upload** — `src/lib/cloudinary.ts` uploads directly
  from the server action using your `CLOUDINARY_*` env vars (signed
  request, API secret never touches the browser). Product and banner
  forms use plain `<input type="file" multiple>` — no client-side upload
  code needed, since the file rides along in the same server action call.
- Every create/update form uses React's `useFormState` so validation
  errors from the server action show up inline without extra client code.
- Admin sidebar now has a working **Sign out** button.
- Dashboard shows real numbers: order count, revenue, pending orders, and
  a restocking checklist for anything at or below its low-stock threshold.

## Try it

After seeding, sign in at `/admin/login`, then:
- `/admin/products/new` — create a product, upload one or more images
- `/admin/orders` — open the order you placed testing Phase 2, move it
  through `CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, or cancel it and
  check `/admin/inventory`'s recent-changes log — the stock came back
- `/admin/coupons` — create a coupon, use it at storefront checkout
- `/admin/banners` — upload a banner, check the homepage

## Not in this phase

Real payment gateway integration (Razorpay, per the Phase 0 schema shape),
CSV export/bulk import, and multi-admin roles beyond the single ADMIN/CUSTOMER
split are not built — flag if you want any of these next.

---

# Phase 4 — Deploy to Netlify with a Production Database

Full step-by-step walkthrough is in **[`DEPLOY.md`](./DEPLOY.md)** —
covers pushing to GitHub, provisioning a production Postgres DB (Neon or
Supabase), setting up Cloudinary and Resend for production, configuring
Netlify's environment variables, going live, a post-deploy smoke-test
checklist, rotating the admin password, and adding a custom domain later.

What changed in the codebase for this phase:
- `package.json` — added a `postinstall: prisma generate` hook (Netlify
  runs a clean `npm install` on every build; without this, the build
  would fail because the Prisma Client wouldn't exist yet) and pinned
  `engines.node` to `>=18.18.0` (Next.js 14's minimum).
- `netlify.toml` — pinned `NODE_VERSION = "20"` in the build environment,
  so Netlify doesn't fall back to an older default.

Nothing else needed to change — the app was already structured for this
(env-var-driven config, no hardcoded URLs, `StoreSettings` for anything
that should be editable without a redeploy).
