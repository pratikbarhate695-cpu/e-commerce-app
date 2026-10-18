import fs from "node:fs/promises";
import path from "node:path";

/**
 * Imports products from folders.
 *
 *   backup-products/items/<any-folder-name>/product.txt
 *   backup-products/items/<any-folder-name>/*.jpg|png|webp   (all images, sorted by file name)
 *
 * Folders starting with "_" are skipped. Run:
 *   npm run db:backup-products          (writes to database)
 *   npm run db:backup-products:dry      (only checks, writes nothing)
 */

const DRY = process.argv.includes("--dry");
const ROOT = path.join(process.cwd(), "backup-products", "items");
const PUBLIC_DIR = path.join(process.cwd(), "public", "product-backup");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

type Item = {
  sku: string;
  name: string;
  slug: string;
  brand: string | null;
  category: string;
  description: string;
  mrp: number;
  sellingPrice: number;
  discountPct: number;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  highlights: string[];
};

const slugify = (v: string) =>
  v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const yes = (v: string | undefined, def: boolean) =>
  v === undefined || v === "" ? def : /^(y|yes|true|1)$/i.test(v.trim());

function parseProduct(text: string, folder: string): Item {
  const lines = text.replace(/\r/g, "").split("\n");
  const f: Record<string, string> = {};
  let desc: string[] | null = null;

  for (const line of lines) {
    if (desc) { desc.push(line); continue; }
    const m = line.match(/^\s*([a-zA-Z_ ]+?)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase().replace(/\s+/g, "_");
    if (key === "description") { desc = m[2] ? [m[2]] : []; continue; }
    f[key] = m[2].trim();
  }

  const need = (k: string) => {
    if (!f[k]) throw new Error(`[${folder}] product.txt is missing "${k}:"`);
    return f[k];
  };
  const num = (k: string, v: string) => {
    const n = Number(v.replace(/[, ₹]/g, ""));
    if (!Number.isFinite(n) || n < 0) throw new Error(`[${folder}] "${k}" must be a number, got "${v}"`);
    return n;
  };

  const description = (desc ?? []).join("\n").trim();
  if (!description) throw new Error(`[${folder}] product.txt is missing "description:" (put the text after it)`);

  const mrp = num("mrp", need("mrp"));
  const sellingPrice = num("price", need("price"));
  if (sellingPrice > mrp) throw new Error(`[${folder}] price is higher than mrp`);

  return {
    sku: need("sku"),
    name: need("name"),
    slug: f.slug ? slugify(f.slug) : slugify(need("name")),
    brand: f.brand || null,
    category: need("category"),
    description,
    mrp,
    sellingPrice,
    discountPct: f.discount ? num("discount", f.discount) : mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
    stockQty: f.stock ? Math.floor(num("stock", f.stock)) : 0,
    lowStockThreshold: f.low_stock ? Math.floor(num("low_stock", f.low_stock)) : 5,
    isActive: yes(f.active, true),
    isFeatured: yes(f.featured, false),
    highlights: (f.highlights ?? "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12),
  };
}

async function main() {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(ROOT, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    throw new Error(`Folder not found: backup-products/items`);
  }
  if (entries.length === 0) {
    console.log("No product folders found in backup-products/items (folders starting with _ are skipped).");
    return;
  }

  // Read and validate everything first, so one bad folder stops before any write.
  const parsed: { folder: string; item: Item; images: string[] }[] = [];
  const seenSku = new Set<string>();
  const seenSlug = new Set<string>();
  for (const folder of entries) {
    const dir = path.join(ROOT, folder);
    let text: string;
    try { text = await fs.readFile(path.join(dir, "product.txt"), "utf8"); }
    catch { throw new Error(`[${folder}] product.txt not found`); }
    const item = parseProduct(text, folder);
    if (seenSku.has(item.sku)) throw new Error(`[${folder}] duplicate sku ${item.sku}`);
    if (seenSlug.has(item.slug)) throw new Error(`[${folder}] duplicate slug ${item.slug}`);
    seenSku.add(item.sku); seenSlug.add(item.slug);
    const images = (await fs.readdir(dir))
      .filter((n) => IMAGE_EXT.has(path.extname(n).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (images.length === 0) {
      throw new Error(`[${folder}] no images found (jpg, png, webp). Add at least one image to the folder.`);
    }
    parsed.push({ folder, item, images });
  }

  if (DRY) {
    for (const p of parsed) console.log(`OK  ${p.item.name}  (${p.item.sku})  ${p.images.length} image(s): ${p.images.join(", ")}`);
    console.log(`\nDry run finished. ${parsed.length} product(s) look valid. Nothing was written.`);
    return;
  }

  const { prisma } = await import("../src/lib/prisma");
  try {
    // Safety check before any write: a reused SKU would overwrite a different product.
    for (const { folder, item } of parsed) {
      const bySku = await prisma.product.findUnique({ where: { sku: item.sku } });
      if (bySku && bySku.slug !== item.slug) {
        throw new Error(`[${folder}] sku ${item.sku} already belongs to "${bySku.name}" (${bySku.slug}). Use a different sku, or the same slug to update that product.`);
      }
      const bySlug = await prisma.product.findUnique({ where: { slug: item.slug } });
      if (bySlug && bySlug.sku !== item.sku) {
        throw new Error(`[${folder}] slug ${item.slug} already belongs to sku ${bySlug.sku}. Change the slug or the sku.`);
      }
    }

    for (const { folder, item, images } of parsed) {
      const catSlug = slugify(item.category);
      const category = await prisma.category.upsert({
        where: { slug: catSlug },
        update: { name: item.category.trim() },
        create: { name: item.category.trim(), slug: catSlug },
      });

      const data = {
        name: item.name, slug: item.slug, brand: item.brand, categoryId: category.id,
        description: item.description, mrp: item.mrp, sellingPrice: item.sellingPrice,
        discountPct: item.discountPct, stockQty: item.stockQty,
        lowStockThreshold: item.lowStockThreshold, isActive: item.isActive, isFeatured: item.isFeatured,
        highlights: item.highlights,
      };
      const existing = await prisma.product.findUnique({ where: { sku: item.sku } });
      const product = await prisma.product.upsert({
        where: { sku: item.sku }, update: data, create: { sku: item.sku, ...data },
      });
      if (!existing && item.stockQty > 0) {
        await prisma.inventoryHistory.create({
          data: { productId: product.id, previousStock: 0, newStock: item.stockQty, quantityChanged: item.stockQty, reason: "NEW_STOCK" },
        });
      }

      // Copy images to public/product-backup/<slug>/ and rebuild this product's folder images.
      const outDir = path.join(PUBLIC_DIR, item.slug);
      await fs.rm(outDir, { recursive: true, force: true });
      await fs.mkdir(outDir, { recursive: true });
      const rows = [];
      for (let i = 0; i < images.length; i++) {
        await fs.copyFile(path.join(ROOT, folder, images[i]), path.join(outDir, images[i]));
        rows.push({
          productId: product.id,
          url: `/product-backup/${item.slug}/${encodeURIComponent(images[i])}`,
          altText: item.name,
          sortOrder: i,
        });
      }
      if (rows.length > 0) {
        await prisma.productImage.deleteMany({
          where: { productId: product.id, url: { startsWith: "/product-backup/" } },
        });
        // Folder images come first; any admin-uploaded (Cloudinary) images keep their place after them.
        await prisma.productImage.updateMany({
          where: { productId: product.id },
          data: { sortOrder: { increment: rows.length } },
        });
        await prisma.productImage.createMany({ data: rows });
      }
      console.log(`Imported: ${item.name}  (${images.length} image(s))`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
