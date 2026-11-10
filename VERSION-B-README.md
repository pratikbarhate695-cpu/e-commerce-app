# Zero Integration — ChatGPT Version B

This is an isolated visual redesign of the existing Next.js storefront. Storefront queries, routes, pricing, cart, checkout, authentication, authorization, inventory, order and payment code have intentionally been retained.

## Run locally (Windows PowerShell)

1. Extract this project to a folder separate from Claude Version A.
2. Configure `.env.local` using **staging-only** credentials. Do not use production credentials. Never commit `.env.local`.
3. From this directory run:

```powershell
npm.cmd install
npm.cmd run dev
```

4. Open `http://localhost:3000`. If port 3000 is occupied, run `npm.cmd run dev -- -p 3001`.

No database reset, migration, `db push`, or seed command is required for the visual redesign. The homepage uses the existing catalog queries and will show the application's empty-catalog state when staging has no products.

## Validation

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

The build requires valid staging-only environment configuration because the application initializes database/auth integrations. Do not run any database-writing command until the target is verified.

## Optional visual-review sample catalog

The project includes `scripts/version-b-sample-catalog.ts` and local SVG illustrations under `public/demo-products/`. This script is **not run automatically**. It upserts only six fictional products and six categories with `zzb-demo-*` slugs / `ZZB-DEMO-*` SKUs. It does not create users, orders, coupons, reviews, or payments.

Before using it, manually confirm `.env.local` is the staging-only configuration and that `DATABASE_URL` points to the staging database. Then set these PowerShell session variables using your own verified values (do not paste them into chat):

```powershell
$env:STAGING_FIXTURES_CONFIRM = "I_AM_USING_A_STAGING_DATABASE"
$env:PRODUCTION_DB_HOST_FRAGMENTS = "<known-production-db-host-fragment>"
npm.cmd run staging:version-b-samples
```

Replace the placeholder with a distinctive fragment from the **production** database hostname so the script can block that host. The script prints only the database hostname, never the connection string. If you cannot positively verify the staging target and production deny-list, do not run the fixture script.
