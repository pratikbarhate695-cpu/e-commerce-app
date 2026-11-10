import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectHeroBanners, selectPromoBanners, slideButton } from "../src/lib/banners/rules";

const SRC = join(__dirname, "..", "src");
const read = (p: string) => readFileSync(join(SRC, p), "utf8");

/* Homepage display: the data rules (above) plus wiring checks on the real files. */

test("homepage: published hero banners replace the built-in hero; with none, the built-in hero remains", () => {
  const page = read("app/(storefront)/page.tsx");
  assert.match(page, /getHomepageBanners\(\)/);
  assert.match(page, /banners\.hero\.length > 0 \? \(\s*<HeroCarousel/);
  assert.match(page, /\) : \(\s*<>[\s\S]*Technology,[\s\S]*<\/>\s*\)\}/, "built-in hero fallback must stay");
  assert.match(page, /banners\.promos\.map/, "promotion strip must stay");
});

test("homepage: a database problem cannot break the page (hero query is guarded)", () => {
  const q = read("lib/banners/queries.ts");
  assert.match(q, /try\s*\{[\s\S]*findMany[\s\S]*\}\s*catch[\s\S]*hero:\s*\[\],\s*promos:\s*\[\]/);
});

test("homepage: preview and live hero use the SAME slide component", () => {
  assert.match(read("components/admin/banner-editor.tsx"), /import \{[^}]*HeroSlide[^}]*\} from "@\/components\/storefront\/hero-banners"/);
  assert.match(read("app/admin/(panel)/banners/page.tsx"), /HeroCarousel/);
  assert.match(read("app/(storefront)/page.tsx"), /HeroCarousel/);
});

test("homepage: unpublished drafts and old promo rows never reach the hero", () => {
  const rows = [
    { id: "1", kind: "HERO", isActive: false, sortOrder: 0 },
    { id: "2", kind: "PROMO", isActive: true, sortOrder: 0 },
  ];
  assert.equal(selectHeroBanners(rows).length, 0);
  assert.equal(selectPromoBanners(rows).length, 1);
});

test("homepage: a slide with a link but no text still gets a usable button", () => {
  assert.equal(slideButton({ linkUrl: "/shop", buttonText: "" })?.label, "Shop now");
});

test("responsive: hero height steps down for phones and the carousel arrows are hidden on small screens", () => {
  const c = read("components/storefront/hero-banners.tsx");
  assert.match(c, /h-\[420px\][^"]*sm:h-\[480px\][^"]*lg:h-\[560px\]/);
  assert.match(c, /hidden[^"]*sm:flex/);
  assert.match(c, /prefers-reduced-motion/);
});

/* Security wiring */

test("security: every exported server action goes through the service (which checks admin first)", () => {
  const a = read("lib/actions/admin/banners.ts");
  assert.match(a, /^"use server";/);
  assert.match(a, /requireAdmin,/);
  assert.ok(!/prisma\./.test(a), "actions must not touch the database directly");
  assert.ok(!/CLOUDINARY/.test(a));
});

test("security: Cloudinary secrets exist only in server-only code, never in client components", () => {
  for (const f of ["components/admin/banner-editor.tsx", "components/admin/banner-row.tsx", "components/storefront/hero-banners.tsx"]) {
    const s = read(f);
    assert.match(s, /^"use client";/, f);
    assert.ok(!/CLOUDINARY|api_secret|apiSecret/i.test(s), f);
    assert.ok(!/from "@\/lib\/cloudinary"/.test(s), f);
  }
  assert.match(read("lib/cloudinary.ts"), /^import "server-only";/);
});

test("security: the admin banners page re-checks admin itself", () => {
  assert.match(read("app/admin/(panel)/banners/page.tsx"), /await requireAdmin\(\)/);
});

test("pure banner modules stay free of framework/alias imports (so they remain unit-testable)", () => {
  for (const f of ["lib/banners/rules.ts", "lib/banners/service.ts"]) {
    assert.ok(!/from\s+["'](@\/|next|react)/.test(read(f)), f);
  }
});

test("schema: new banner columns are additive (optional or defaulted) so existing rows survive", () => {
  const schema = readFileSync(join(__dirname, "..", "prisma", "schema.prisma"), "utf8");
  const model = schema.match(/model HomepageBanner \{([\s\S]*?)\n\}/)![1];
  assert.match(model, /kind\s+String\s+@default\("PROMO"\)/);
  for (const col of ["subtitle", "buttonText", "altText", "imagePublicId"]) {
    assert.match(model, new RegExp(`${col}\\s+String\\?`), col);
  }
});
