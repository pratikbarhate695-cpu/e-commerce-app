/**
 * Safe database check. Prints NO passwords or full URLs.
 *   npm run db:check
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

// tsx does not read .env by itself, so load it here (only fills values that are missing).
for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

async function timeIt<T>(fn: () => Promise<T>) {
  const t = Date.now();
  const r = await fn();
  return { ms: Date.now() - t, r };
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set in .env");
  const u = new URL(raw);
  console.log("Host type      :", u.hostname.includes("-pooler") ? "Neon POOLED (-pooler) - good for the website" : "DIRECT (no -pooler) - use the pooled host for the website");
  console.log("Region host    :", u.hostname.replace(/^[^.]+\./, "*."));
  console.log("pgbouncer      :", u.searchParams.get("pgbouncer") ?? "(not set; added automatically for -pooler hosts)");
  console.log("connection_limit:", u.searchParams.get("connection_limit") ?? "(not set; app default 10 dev / 5 production)");
  console.log("sslmode        :", u.searchParams.get("sslmode") ?? "(not set)");

  const { prisma } = await import("../src/lib/prisma");
  const client: PrismaClient = prisma;
  try {
    const first = await timeIt(() => client.$queryRaw`SELECT 1`);
    console.log(`\nFirst query    : ${first.ms} ms  (over ~2000 ms means the Neon database was asleep or is far away)`);
    const times: number[] = [];
    for (let i = 0; i < 5; i++) times.push((await timeIt(() => client.$queryRaw`SELECT 1`)).ms);
    console.log("Next 5 queries :", times.join(", "), "ms  (should each be roughly 20-300 ms)");

    const rows = await client.$queryRaw<{ state: string | null; n: bigint }[]>`
      SELECT state, count(*)::bigint AS n FROM pg_stat_activity
      WHERE datname = current_database() GROUP BY state ORDER BY n DESC`;
    console.log("\nDatabase connections right now:");
    for (const r of rows) console.log("  ", r.state ?? "(background)", ":", Number(r.n));

    const stuck = await client.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM pg_stat_activity
      WHERE datname = current_database() AND state = 'idle in transaction'`;
    console.log("Stuck 'idle in transaction':", Number(stuck[0]?.n ?? 0), "(should be 0)");
  } finally {
    await client.$disconnect();
  }
}

main().catch((e) => {
  console.error("db:check failed:", e instanceof Error ? e.message.split("\n").slice(-3).join(" ") : e);
  process.exit(1);
});
