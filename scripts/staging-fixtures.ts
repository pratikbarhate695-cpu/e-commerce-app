/**
 * STAGING-ONLY synthetic catalogue for testing category hierarchy and pagination.
 *
 *   npm run staging:fixtures            # create / refresh test data
 *   npm run staging:fixtures -- --cleanup   # remove (or hide) it again
 *
 * It refuses to run unless ALL of these are true (it fails closed):
 *   1. STAGING_FIXTURES_CONFIRM=I_AM_USING_A_STAGING_DATABASE is set
 *   2. PRODUCTION_DB_HOST_FRAGMENTS is set (comma-separated text that appears in your
 *      PRODUCTION database host, e.g. "ep-prod-abc") and the DATABASE_URL host does NOT contain any of it
 *   3. DATABASE_URL is set
 * It never prints the database URL, only the host name, and only touches rows whose
 * slug starts with "zz-test-" / sku starts with "ZZTEST-".
 *
 * Test shape (42 products, so Shop needs 2 pages; Phones alone needs 2 pages):
 *   ZZ Test Electronics            (no products of its own)
 *     ZZ Test Phones   (30)         -> 2 pages inside the category
 *       ZZ Test Android (2)         -> three levels deep
 *     ZZ Test Tablets  (3)
 *   ZZ Test Audio      (2 own)
 *     ZZ Test Earbuds  (3)
 *   ZZ Test Chargers   (2)          -> flat category
 *   ZZ Test Empty Parent (0) > ZZ Test Empty Child (0)   -> must NOT appear anywhere
 */
import fs from "node:fs";
import type { PrismaClient } from "@prisma/client"; // type only: the real client is loaded AFTER the guard passes

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function refuse(message: string): never {
  console.error(`REFUSED: ${message}`);
  process.exit(1);
  throw new Error(message); // unreachable; keeps the `never` return type honest
}

function guard(): string {
  if (process.env.STAGING_FIXTURES_CONFIRM !== "I_AM_USING_A_STAGING_DATABASE") {
    refuse("set STAGING_FIXTURES_CONFIRM=I_AM_USING_A_STAGING_DATABASE to confirm this is a staging database.");
  }
  const raw = process.env.DATABASE_URL;
  if (!raw) refuse("DATABASE_URL is not set.");
  const blocked = (process.env.PRODUCTION_DB_HOST_FRAGMENTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (blocked.length === 0) {
    refuse("set PRODUCTION_DB_HOST_FRAGMENTS (text found in your PRODUCTION database host) so production can be blocked.");
  }
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    refuse("DATABASE_URL is not a valid URL.");
  }
  const hit = blocked.find((fragment) => host.includes(fragment));
  if (hit) refuse("the DATABASE_URL host matches a production fragment. Use the staging database.");
  return host;
}

type Spec = { name: string; slug: string; parent?: string; products: number };
const CATEGORIES: Spec[] = [
  { name: "ZZ Test Electronics", slug: "zz-test-electronics", products: 0 },
  { name: "ZZ Test Phones", slug: "zz-test-phones", parent: "zz-test-electronics", products: 30 },
  { name: "ZZ Test Android", slug: "zz-test-android", parent: "zz-test-phones", products: 2 },
  { name: "ZZ Test Tablets", slug: "zz-test-tablets", parent: "zz-test-electronics", products: 3 },
  { name: "ZZ Test Audio", slug: "zz-test-audio", products: 2 },
  { name: "ZZ Test Earbuds", slug: "zz-test-earbuds", parent: "zz-test-audio", products: 3 },
  { name: "ZZ Test Chargers", slug: "zz-test-chargers", products: 2 },
  { name: "ZZ Test Empty Parent", slug: "zz-test-empty-parent", products: 0 },
  { name: "ZZ Test Empty Child", slug: "zz-test-empty-child", parent: "zz-test-empty-parent", products: 0 },
];

async function create(prisma: PrismaClient) {
  const idBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const parentId = c.parent ? idBySlug.get(c.parent) ?? null : null;
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, parentId },
      create: { name: c.name, slug: c.slug, parentId },
    });
    idBySlug.set(c.slug, row.id);
  }
  let made = 0;
  for (const c of CATEGORIES) {
    for (let i = 1; i <= c.products; i++) {
      const n = String(i).padStart(2, "0");
      const slug = `${c.slug}-item-${n}`;
      const data = {
        sku: `ZZTEST-${c.slug.replace("zz-test-", "").toUpperCase()}-${n}`,
        name: `${c.name} Item ${n}`,
        slug,
        brand: "ZZ Test",
        description: "Synthetic staging product for category and pagination testing.",
        mrp: 1000 + i,
        sellingPrice: 900 + i,
        stockQty: 20,
        isActive: true,
        categoryId: idBySlug.get(c.slug)!,
      };
      await prisma.product.upsert({
        where: { slug },
        update: { isActive: true, categoryId: data.categoryId },
        create: { ...data, images: { create: [{ url: "/brand/logo.png", sortOrder: 0 }] } },
      });
      made++;
    }
  }
  console.log(`Fixtures ready: ${CATEGORIES.length} categories, ${made} products.`);
}

async function cleanup(prisma: PrismaClient) {
  const products = await prisma.product.findMany({ where: { sku: { startsWith: "ZZTEST-" } }, select: { id: true, slug: true } });
  let deleted = 0;
  let hidden = 0;
  for (const p of products) {
    try {
      await prisma.product.delete({ where: { id: p.id } });
      deleted++;
    } catch {
      // Referenced by a test order or cart: keep the row but hide it from the storefront.
      await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });
      hidden++;
    }
  }
  // Children first so parent links never block deletion.
  for (const c of [...CATEGORIES].reverse()) {
    try {
      await prisma.category.delete({ where: { slug: c.slug } });
    } catch {
      /* still has products or does not exist: leave it */
    }
  }
  console.log(`Cleanup: ${deleted} products deleted, ${hidden} hidden (referenced by test orders/carts).`);
}

async function main() {
  const host = guard();
  console.log(`Target database host: ${host}`);
  const { PrismaClient: Client } = await import("@prisma/client");
  const prisma = new Client();
  try {
    if (process.argv.includes("--cleanup")) await cleanup(prisma);
    else await create(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
