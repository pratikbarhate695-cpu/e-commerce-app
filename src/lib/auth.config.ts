import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config: no Prisma, no bcrypt. This is what middleware.ts
 * imports. Route-gating decisions live here so they can run at the edge,
 * but every admin API handler *also* re-checks the session independently
 * (see src/lib/actions/require-admin.ts) — CVE-2025-29927 showed that
 * middleware-only protection can be bypassed by spoofing request headers,
 * so middleware is a fast first gate, never the only gate.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const { pathname } = request.nextUrl;

      const isAdminRoute =
        pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
      const isAdminApi = pathname.startsWith("/api/admin");
      const isAccountRoute =
        pathname.startsWith("/account") ||
        pathname === "/cart" ||
        pathname === "/checkout";

      if (isAdminRoute || isAdminApi) {
        return isLoggedIn && role === "ADMIN";
      }

      if (isAccountRoute) {
        return isLoggedIn;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CUSTOMER" | "ADMIN";
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts, which has Node-only providers
} satisfies NextAuthConfig;
