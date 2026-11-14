import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_PRODUCTS, HERO_IMAGE, getDemoProduct } from "../src/lib/demo-catalog";

const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");

test("hero image file exists and is not empty", () => {
  const file = join(PUBLIC, HERO_IMAGE);
  assert.ok(existsSync(file), `${HERO_IMAGE} is missing from /public`);
  assert.ok(readFileSync(file).length > 500, "hero image looks empty");
});

test("every demo product has an existing image file (the bug that caused blank cards)", () => {
  assert.equal(DEMO_PRODUCTS.length, 6);
  for (const p of DEMO_PRODUCTS) {
    assert.ok(existsSync(join(PUBLIC, p.image)), `missing image for "${p.name}": ${p.image}`);
  }
});

test("demo slugs are unique, URL-safe, and prices are positive", () => {
  const slugs = DEMO_PRODUCTS.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const p of DEMO_PRODUCTS) {
    assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(p.price > 0);
    assert.equal(getDemoProduct(p.slug)?.name, p.name);
  }
  assert.equal(getDemoProduct("does-not-exist"), undefined);
});

test("preview page has no cart, checkout, payment or database code, and is noindex", () => {
  const src = readFileSync(join(ROOT, "src/app/(storefront)/preview/[slug]/page.tsx"), "utf8");
  for (const forbidden of [/@\/lib\/prisma/, /actions\/cart/, /actions\/checkout/, /razorpay/i, /add-to-cart/i, /pay-now/i, /checkout-form/i]) {
    assert.doesNotMatch(src, forbidden, `preview page must not reference ${forbidden}`);
  }
  assert.match(src, /index:\s*false/);
});

test("homepage shows samples only when there are no real products (categories alone must not hide them)", () => {
  const src = readFileSync(join(ROOT, "src/app/(storefront)/page.tsx"), "utf8");
  assert.match(src, /const hasRealProducts = featured\.length > 0 \|\| latest\.length > 0;/);
  assert.match(src, /\{!hasRealProducts && \(/);
  assert.doesNotMatch(src.split("hasRealProducts =")[1].split(";")[0], /tiles|categories/);
});
