# Phase 4 — Deploying to Netlify with a Production Database

This is a from-scratch walkthrough: no assumptions that anything is set up
yet beyond the code in this repo. Follow it in order.

## 0. Accounts you'll need (all have working free tiers)

- [GitHub](https://github.com) — Netlify deploys from a Git repo, not a zip upload
- [Netlify](https://netlify.com)
- [Neon](https://neon.tech) or [Supabase](https://supabase.com) — Postgres
- [Cloudinary](https://cloudinary.com) — product/banner images
- [Resend](https://resend.com) — password reset emails

---

## 1. Push the code to GitHub

```bash
cd ecommerce-app
git init
git add .
git commit -m "Initial commit"
```

Create a new **empty** repo on GitHub (no README/gitignore — you already
have one), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

`.env` is already in `.gitignore` — double check `git status` doesn't show
it before you push. If it does, `git rm --cached .env` first.

---

## 2. Create the production database

**Neon** (recommended — generous free tier, scales to zero when idle):
1. New Project → pick a region close to where Netlify will run your
   functions (Netlify's default region is `us-east-1`, so `us-east-1` or
   nearby minimizes latency).
2. Copy the **pooled** connection string it gives you (Neon shows both a
   direct and a pooled URL — use the pooled one for `DATABASE_URL`, since
   serverless functions open/close connections constantly and pooling
   avoids exhausting Postgres's connection limit).

**Supabase** works the same way: Project Settings → Database → Connection
string → use the "Transaction" pooler (port 6543), not the direct
connection.

Either way you end up with something like:

```
postgresql://user:password@host/dbname?sslmode=require
```

Keep this value handy — it goes in `.env` locally (for the next step) and
in Netlify's environment variables (step 5).

---

## 3. Push the schema and seed the database

Do this from your machine, pointed at the **production** database, before
the first deploy — the running app expects the tables and the first admin
to already exist.

```bash
cd ecommerce-app
npm install
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` — from step 2
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — your real admin login,
  not the placeholder
- `AUTH_SECRET` — generate one:
  ```bash
  npx auth secret
  ```
  (writes a random value into `.env` for you)
- Leave `NEXT_PUBLIC_APP_URL` as `http://localhost:3000` for now — you'll
  update it to the real URL after Netlify gives you one in step 5.
- `CLOUDINARY_*` and `RESEND_API_KEY` — see steps 4a/4b below.

Then:

```bash
npm run db:push    # creates every table from prisma/schema.prisma
npm run db:seed    # creates your admin account + sample catalog + coupon
```

`db:push` (not migrations) is the right tool here — see the note at the
bottom of this file on when to switch to `prisma migrate`.

---

## 4a. Cloudinary

Dashboard → copy **Cloud name**, **API Key**, **API Secret** into
`.env`/Netlify as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`. Nothing else to configure — uploads go to a
`products/` folder automatically (see `src/lib/cloudinary.ts`).

## 4b. Resend

1. Add and verify a sending domain (Domains → Add Domain, then add the DNS
   records it gives you at your domain registrar) — or, to test quickly
   before you own a domain, Resend lets you send from
   `onboarding@resend.dev` to your own verified email address only.
2. API Keys → create one → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to an address on your verified domain, e.g.
   `Store <no-reply@yourdomain.com>`.

---

## 5. Create the Netlify site

1. Netlify → **Add new site → Import an existing project** → pick your
   GitHub repo.
2. Build settings: Netlify will detect `netlify.toml` and use
   `npm run build` / publish `.next` automatically — you shouldn't need to
   change anything here.
3. **Before the first deploy**, add environment variables: Site
   configuration → Environment variables → add each of these (same names
   as `.env.example`):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | from step 2 |
   | `AUTH_SECRET` | from step 3 |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | your admin login (only used if you re-run the seed script — see step 8) |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from step 4a |
   | `RESEND_API_KEY` / `EMAIL_FROM` | from step 4b |
   | `NEXT_PUBLIC_APP_URL` | leave blank for now, come back after step 6 |

4. Deploy site. First build takes a few minutes (installs deps, runs
   `prisma generate` via the `postinstall` script, then `next build`).

---

## 6. Set the real app URL

Once the deploy succeeds, Netlify gives you a URL like
`https://your-site-name.netlify.app`. Go back into environment variables
and set:

```
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
```

This is what password-reset emails link to — trigger a redeploy (Deploys →
Trigger deploy) after changing it so the new value takes effect.

---

## 7. Smoke test

- Visit the site → home page loads, sample products show
- `/admin/login` → sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `/admin/products` → create a product with an image → confirm it appears
  on `/shop`
- As a separate (incognito) session: register a customer account, add
  something to cart, check out with `WELCOME10`, confirm the order lands
  in `/admin/orders`
- `/forgot-password` → confirm the email arrives (check spam if using a
  freshly-verified domain)

---

## 8. Rotating the admin password later

There's no in-app "change my password" for the admin account — it's
controlled entirely by the seed script. To rotate it:

1. Update `ADMIN_PASSWORD` in Netlify's environment variables (and
   locally in `.env` if you want to run it from your machine).
2. Re-run `npm run db:seed` **pointed at the production `DATABASE_URL`**
   (from your machine, or via `netlify dev`/`netlify env:get` to pull the
   value down). The seed script re-hashes and updates the existing admin
   row rather than creating a duplicate.

---

## 9. Custom domain later

Domain settings → Add a domain → follow Netlify's DNS instructions
(usually just an A/CNAME record at your registrar). No code changes
needed — just update `NEXT_PUBLIC_APP_URL` to the new domain and redeploy,
same as step 6.

---

## A note on `db:push` vs. real migrations

This guide uses `prisma db push`, which is fine for a solo project or a
small team — it syncs the database to match `schema.prisma` directly, no
migration history. The tradeoff: there's no record of *how* the schema
changed over time, and `db push` can't always express a change safely if
it would lose data (it'll warn you, not silently drop things, but it also
won't write a rollback-able migration file).

If you add more people to this project or want repeatable, reviewable
schema changes, switch to:

```bash
npx prisma migrate dev --name init    # generates prisma/migrations/, run locally against a dev DB
```

then in CI/deploy, `prisma migrate deploy` instead of `db push`. This
repo doesn't have a `prisma/migrations` folder yet, so that's a deliberate
starting point, not an oversight — worth doing before this goes from "my
store" to "a store other people help run."
