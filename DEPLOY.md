# Zero Integration — deployment and environment guide

This guide describes the **current** application. It replaces the older Auth.js / password-reset setup instructions that were present in earlier project phases.

## 1. Before deploying

- Make changes in a separate branch or staging copy.
- Verify the database target. Use a staging Neon branch, not the production branch.
- Use Razorpay test credentials and a staging webhook while testing.
- Keep `.env`, `.env.local`, database URLs, Supabase keys, Razorpay secrets and Cloudinary secrets out of Git and out of chat.
- Do not deploy this ZIP automatically; first run the local checks and browser verification below.

## 2. Environment variables

Use `.env.example` as the current template.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled PostgreSQL URL used by the application (Neon host normally contains `-pooler`) |
| `DIRECT_URL` | Direct, non-pooler PostgreSQL URL for Prisma CLI schema operations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon client key |
| `RAZORPAY_KEY_ID` | Server-side Razorpay key ID |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Matching public Razorpay key ID used by checkout.js |
| `RAZORPAY_KEY_SECRET` | Server-side Razorpay API and checkout-signature secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured for the Razorpay webhook endpoint |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Signed product, review and banner image uploads |
| `ADMIN_EMAIL`, `ADMIN_NAME` | Used by the one-time Prisma seed script to create/promote the Prisma admin row |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional legacy password-reset email helper; customer login currently uses Supabase email OTP |

`DATABASE_URL` and `DIRECT_URL` must point to the **same staging database branch** during staging schema work. The app runtime uses the pooled `DATABASE_URL`.

## 3. Authentication and admin access

Authentication is handled by Supabase Auth, not Auth.js.

- Customers sign in using the email OTP flow at `/login`.
- Admins use email/password at `/admin/login`.
- Admin access requires both a Prisma `User.role` of `ADMIN` and `app_role = "admin"` in that Supabase user's `app_metadata`.
- `src/proxy.ts` is the first route gate. Admin pages and server actions independently call `requireAdmin()` and read the Prisma role.

Follow [AUTH.md](./AUTH.md) for the Supabase dashboard steps. Do not add a Supabase service-role key to this application.

## 4. Database caution

This repository has `prisma/schema.prisma` but currently has **no `prisma/migrations/` history**. The existing staging schema was synchronized manually and checked against the Prisma schema.

For an existing database:

1. Confirm the target branch in the Neon dashboard independently.
2. Take or verify a backup/branch point.
3. Compare the live schema with `prisma/schema.prisma` before any schema write.
4. Do not run `prisma db push`, `prisma migrate dev`, `prisma migrate deploy`, seed scripts or fixture cleanup against production as part of a routine deploy.

For a brand-new empty staging database only, schema creation may be planned separately using the direct URL. Review the Prisma diff and expected SQL before executing it. Do not use the seed script against an existing store without checking its sample catalogue and coupon behavior first.

## 5. Netlify settings

The repository's `netlify.toml` sets:

- Build command: `npm run build`
- Publish directory: `.next`
- Node.js: `24`
- Next.js adapter: `@netlify/plugin-nextjs`

Set the environment variables required by the current code before building. `NEXT_PUBLIC_*` values are embedded during build, so changing them requires a new build/deploy.

## 6. Razorpay webhook

The route is:

`https://YOUR-STAGING-HOST/api/webhooks/razorpay`

The handler verifies the HMAC signature against the raw request body. The current code processes `payment.captured`, `order.paid` and `payment.failed`. Configure the webhook secret to match `RAZORPAY_WEBHOOK_SECRET` for that environment. Do not use live keys or a production webhook for staging tests.

The app verifies browser confirmation directly against Razorpay and checks payment ID, order ID, INR currency, amount and captured status before marking an order paid.

## 7. Local verification (Windows PowerShell)

From the project folder:

```powershell
npm.cmd install
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Use only staging environment values. The build may need valid staging Supabase and database configuration because server-rendered pages initialize those integrations.

Then verify in a browser, in both light and dark themes:

- Customer OTP sign-in and sign-out
- Admin sign-in; customer cannot access admin routes or actions
- Product browsing, search, categories, cart and coupon calculations
- Checkout using Razorpay test mode: success, failure, browser callback and webhook retry/idempotency
- Order history, admin status changes, stock restoration and banner upload/replace/remove/preview
- Mobile layouts at approximately 320px and 390px widths

See [docs/STAGING-VERIFICATION.md](./docs/STAGING-VERIFICATION.md) for the detailed staging checklist.

## 8. Refund limitation

Refunds are **not automated or fully recorded by the application yet**. The app does not call Razorpay's refund API, process refund webhooks, or provide an admin workflow that records a refund reference and amount. When a refund is required, it must currently be handled manually in the Razorpay dashboard and reconciled outside the app. Do not mark an order as refunded merely because it was cancelled or returned.
