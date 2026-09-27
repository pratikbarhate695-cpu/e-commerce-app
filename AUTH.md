# Authentication (Supabase Auth)

## How it works
- Customers sign in at /login with an emailed code. The first sign-in creates the account.
- The admin signs in at /admin/login with email + password.
- Admin access needs BOTH: role ADMIN on the Prisma User row, and
  `app_role = "admin"` in the Supabase user's app_metadata (only you can set it).
- src/middleware.ts is a fast first gate. Every admin page/action re-checks
  with requireAdmin() (src/lib/actions/require-admin.ts).
- Never put the Supabase secret / service_role key in this project, Netlify or GitHub.

## Environment variables (Netlify + local .env.local)
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
They are baked in at build time, so redeploy after changing them.
The prefix must be NEXT_PUBLIC_ (VITE_ does nothing in Next.js).

## Supabase dashboard checklist
1. Email provider enabled, "Confirm email" ON.
2. Emails > Templates: put {{ .Token }} in "Magic Link" AND "Confirm signup".
   If template editing is locked, set up custom SMTP first
   (Resend: host smtp.resend.com, port 465, user "resend", password = Resend API key).
3. URL Configuration: Site URL = your live URL; add http://localhost:3000.
4. Phone/SMS OTP later: needs an SMS provider.

## Create or change the admin
1. Supabase > Authentication > Users > Add user (email + password, auto-confirm).
2. Put the same email in ADMIN_EMAIL and run `npm run db:seed`
   (creates/promotes the Prisma user with role ADMIN).
3. Supabase SQL editor:
       update auth.users
       set raw_app_meta_data = raw_app_meta_data || '{"app_role":"admin"}'::jsonb
       where email = 'YOUR_ADMIN_EMAIL';
4. Sign in at /admin/login. (Sign out and in again if you were already signed in.)

To remove admin access: set the Prisma role to CUSTOMER and run
`update auth.users set raw_app_meta_data = raw_app_meta_data - 'app_role' where email = '...';`

## Where things live
- src/lib/supabase/{client,server,middleware}.ts  Supabase clients
- src/lib/session.ts                              auth(): current user (links/creates the Prisma user)
- src/lib/actions/admin-login.ts                  admin password login
- src/components/auth/login-form.tsx              customer email-code login
