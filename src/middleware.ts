import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Fast first gate, not the only one: every admin page/action still calls
// requireAdmin() (src/lib/actions/require-admin.ts), which checks the
// Prisma User role. Middleware alone is never trusted.
//
// Admin marker: app_metadata.app_role = "admin" on the Supabase user.
// app_metadata can only be changed with the service role / SQL editor,
// never by the user (unlike user_metadata).

function inSection(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(base + "/");
}

// If the session was refreshed on this request, keep the new cookies
// when we answer with a redirect or a 401 instead of `response`.
function withSessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function middleware(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isLoggedIn = !!claims;
  const isAdmin = claims?.app_metadata?.app_role === "admin";

  const isAdminApi = inSection(pathname, "/api/admin");
  const isAdminArea =
    inSection(pathname, "/admin") && !inSection(pathname, "/admin/login");
  const isCustomerArea =
    inSection(pathname, "/account") ||
    pathname === "/cart" ||
    pathname === "/checkout";

  // Admin pages: admins only. Everyone else goes to the ADMIN login.
  if (isAdminApi && !isAdmin) {
    return withSessionCookies(
      response,
      NextResponse.json({ ok: false }, { status: 401 })
    );
  }
  if (isAdminArea && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return withSessionCookies(response, NextResponse.redirect(url));
  }

  // Customer-only pages: must be signed in, and admins are kept out
  // (admin and customer accounts stay separate).
  if (isCustomerArea && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("from", pathname + search);
    return withSessionCookies(response, NextResponse.redirect(url));
  }
  if (isCustomerArea && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    url.search = "";
    return withSessionCookies(response, NextResponse.redirect(url));
  }

  return response;
}

// Runs on every page (not just the gated ones) because the storefront reads
// the session everywhere, and this is what keeps Supabase tokens refreshed.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
