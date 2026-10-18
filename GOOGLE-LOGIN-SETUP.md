GOOGLE LOGIN SETUP (code is already in the project; this is only configuration)

A. Google Cloud (console.cloud.google.com)
   1. Create/select a project > APIs & Services > OAuth consent screen: fill app name + your email, publish.
   2. Credentials > Create credentials > OAuth client ID > Web application.
   3. Authorized redirect URI (exactly):  https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
      (find the ref in Supabase > Project Settings > API > Project URL)
   4. Copy the Client ID and Client secret.

B. Supabase dashboard
   1. Authentication > Providers > Google: enable, paste Client ID + Client secret, save.
   2. Authentication > URL Configuration:
      Site URL: your live site (https://YOUR-SITE)
      Redirect URLs: add  http://localhost:3000/**  and  https://YOUR-SITE/**

C. Test: open /login, click "Continue with Google".

Notes
- New Google users become CUSTOMER automatically. Admin is never granted from Google.
- If an email already has an email-code account, Supabase links Google to it automatically (same verified email).
- An admin account that is not linked yet cannot be claimed through Google; admins use /admin/login.
