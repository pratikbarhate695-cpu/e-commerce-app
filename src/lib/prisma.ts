import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Adds safe pool settings to DATABASE_URL when they are missing.
 * Anything you already set in the URL is kept as it is. The URL is never logged.
 * - pgbouncer=true when the host is a Neon pooler host (contains "-pooler")
 * - connect_timeout / pool_timeout 30s, so a sleeping Neon database has time to wake up
 * - connection_limit: 5 in production (each serverless function has its own pool), 10 in dev
 */
function databaseUrlWithDefaults(raw: string | undefined) {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const p = url.searchParams;
    if (url.hostname.includes("-pooler") && !p.has("pgbouncer")) p.set("pgbouncer", "true");
    if (!p.has("connect_timeout")) p.set("connect_timeout", "30");
    if (!p.has("pool_timeout")) p.set("pool_timeout", "30");
    if (!p.has("connection_limit")) {
      p.set("connection_limit", process.env.NODE_ENV === "production" ? "5" : "10");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrlWithDefaults(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
