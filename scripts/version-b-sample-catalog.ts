/**
 * Version B visual-review catalogue. STAGING ONLY; never run against production.
 * Requires an explicit staging confirmation and a production-host deny-list.
 * Creates/updates only categories with slug zzb-demo-* and products with SKU ZZB-DEMO-*.
 * Does not create users, orders, coupons, reviews, payments, or modify other records.
 */
import fs from "node:fs";
import type { PrismaClient } from "@prisma/client";

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^([\'\"])(.*)\1$/, "$2");
  }
}
function refuse(message: string): never {
  console.error(`REFUSED: ${message}`); process.exit(1); throw new Error(message);
}
function verifyStagingTarget() {
  if (process.env.STAGING_FIXTURES_CONFIRM !== "I_AM_USING_A_STAGING_DATABASE") refuse("Set STAGING_FIXTURES_CONFIRM=I_AM_USING_A_STAGING_DATABASE to confirm staging.");
  const raw = process.env.DATABASE_URL;
  if (!raw) refuse("DATABASE_URL is not set.");
  const blocked = (process.env.PRODUCTION_DB_HOST_FRAGMENTS ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!blocked.length) refuse("Set PRODUCTION_DB_HOST_FRAGMENTS to a comma-separated production DB host deny-list.");
  let host = "";
  try { host = new URL(raw).hostname.toLowerCase(); } catch { refuse("DATABASE_URL is not a valid URL."); }
  if (blocked.some(fragment => host.includes(fragment))) refuse("DATABASE_URL matches a blocked production host fragment.");
  console.log(`Verified target host (hostname only): ${host}`);
}
const samples = [
  { category: "Smartphones", catSlug: "zzb-demo-smartphones", name: "ZI Demo Smartphone", slug: "zzb-demo-smartphone", sku: "ZZB-DEMO-PHONE", price: 24999, image: "/demo-products/smartphone.svg", description: "Fictional product used only to evaluate the Version B storefront layout." },
  { category: "Laptops", catSlug: "zzb-demo-laptops", name: "ZI Demo Laptop", slug: "zzb-demo-laptop", sku: "ZZB-DEMO-LAPTOP", price: 54999, image: "/demo-products/laptop.svg", description: "Fictional product used only to evaluate the Version B storefront layout." },
  { category: "Tablets", catSlug: "zzb-demo-tablets", name: "ZI Demo Tablet", slug: "zzb-demo-tablet", sku: "ZZB-DEMO-TABLET", price: 18999, image: "/demo-products/tablet.svg", description: "Fictional product used only to evaluate the Version B storefront layout." },
  { category: "Headphones", catSlug: "zzb-demo-headphones", name: "ZI Demo Wireless Headphones", slug: "zzb-demo-headphones", sku: "ZZB-DEMO-HEADPHONES", price: 3999, image: "/demo-products/headphones.svg", description: "Fictional product used only to evaluate the Version B storefront layout." },
  { category: "Earbuds", catSlug: "zzb-demo-earbuds", name: "ZI Demo Wireless Earbuds", slug: "zzb-demo-earbuds", sku: "ZZB-DEMO-EARBUDS", price: 2499, image: "/demo-products/earbuds.svg", description: "Fictional product used only to evaluate the Version B storefront layout." },
  { category: "Smart TVs", catSlug: "zzb-demo-tvs", name: "ZI Demo Smart TV", slug: "zzb-demo-smart-tv", sku: "ZZB-DEMO-TV", price: 32999, image: "/demo-products/tv.svg", description: "Fictional product used only to evaluate the Version B storefront layout." },
];
async function main() {
  verifyStagingTarget();
  const { PrismaClient: Client } = await import("@prisma/client");
  const prisma: PrismaClient = new Client();
  try {
    for (const item of samples) {
      const category = await prisma.category.upsert({ where: { slug: item.catSlug }, update: { name: item.category }, create: { name: item.category, slug: item.catSlug } });
      await prisma.product.upsert({
        where: { slug: item.slug },
        update: { name: item.name, brand: "Zero Integration Demo", description: item.description, mrp: item.price, sellingPrice: item.price, discountPct: 0, stockQty: 10, isActive: true, isFeatured: true, categoryId: category.id },
        create: { sku: item.sku, name: item.name, slug: item.slug, brand: "Zero Integration Demo", description: item.description, mrp: item.price, sellingPrice: item.price, discountPct: 0, stockQty: 10, isActive: true, isFeatured: true, categoryId: category.id, images: { create: [{ url: item.image, altText: `${item.name} — fictional staging sample`, sortOrder: 0 }] } },
      });
    }
    console.log(`Version B demo catalogue ready: ${samples.length} clearly labelled synthetic products. No orders, users, coupons, reviews, or payment data touched.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Fixture process failed."); process.exit(1); });
