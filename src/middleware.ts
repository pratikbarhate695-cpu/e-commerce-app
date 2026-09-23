import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe instance: authConfig has no Prisma/bcrypt, so this can run
// on the edge runtime. This is the first gate, not the only one — every
// admin server action / route handler re-checks the session itself.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/api/admin/:path*",
    "/cart",
    "/checkout",
  ],
};
