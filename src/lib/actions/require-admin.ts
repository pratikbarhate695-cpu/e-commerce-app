import "server-only";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Independent re-check for every admin server action and /api/admin/*
 * route handler. Deliberately duplicates what middleware.ts already
 * checks — see the note in auth.config.ts on CVE-2025-29927. Throws
 * rather than redirecting, since this also runs inside API handlers.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new UnauthorizedError();
  }
  return session.user;
}

/**
 * Same idea for any logged-in customer action (cart, checkout, account).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user;
}
