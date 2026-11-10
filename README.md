# Zero Integration

Current project: a Next.js 16 / React 19 e-commerce storefront and admin dashboard.

## Current features

- Storefront catalogue, categories, search, product galleries, reviews and product questions
- Customer sign-in with Supabase email OTP; admin sign-in with Supabase email/password
- Admin access requires both `role = ADMIN` in Prisma and `app_role = "admin"` in Supabase `app_metadata`
- Cart, server-side pricing, coupons, checkout and Razorpay online payments
- Razorpay checkout-signature and webhook verification, idempotent payment processing, unpaid-order expiry
- Transactional inventory changes with history
- Admin products, categories, coupons, orders, customers, inventory, settings and homepage banners
- Cloudinary image storage and light/dark theme

## Local setup (Windows PowerShell)

1. Use a separate local folder; do not work directly in the production deployment folder.
2. Copy `.env.example` to `.env.local` and fill it with **staging-only** credentials.
3. Install and run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

For the exact authentication and admin setup, read [AUTH.md](./AUTH.md). For staging verification, read [VERSION-B-README.md](./VERSION-B-README.md) and [docs/STAGING-VERIFICATION.md](./docs/STAGING-VERIFICATION.md).

## Environment variables

See `.env.example` for the current variable list. Use a pooled PostgreSQL URL for `DATABASE_URL` and a direct (non-pooler) URL for `DIRECT_URL` when running Prisma CLI schema operations. Never commit or share `.env`, `.env.local`, or real credentials.

## Safety notes

- Test against a staging database and Razorpay **test** keys first.
- Do not run `prisma db push`, seed scripts, migrations, or cleanup fixtures against production unless the target is independently verified and a backup/change plan is in place.
- This repository currently has no Prisma migration history. Do not run `prisma migrate dev` or `migrate deploy` as a shortcut on the existing database.
- Refunds are not automated in this version. A refund must be issued and reconciled manually in Razorpay; the app does not yet have a complete refund-recording workflow.
- Passing unit tests or a production build does not replace browser testing of sign-in, checkout, payment callbacks and webhooks.

## Deployment

Read [DEPLOY.md](./DEPLOY.md) before preparing a deployment. Do not deploy this review copy directly to the live site.
