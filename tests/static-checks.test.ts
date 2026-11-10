import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
  }
  return out;
}
const read = (p: string) => readFileSync(p, "utf8");
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, "/");

// ---------- colour maths (WCAG 2.x) ----------
type RGB = [number, number, number];
const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (c: RGB) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const blend = (fg: RGB, bg: RGB, alpha: number): RGB =>
  [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as RGB;
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

// Read the REAL theme tokens from globals.css so this stays true if they change.
const css = read(join(SRC, "app/globals.css"));
function tokens(block: RegExp): Record<string, RGB> {
  const body = css.match(block)?.[1] ?? "";
  const out: Record<string, RGB> = {};
  for (const m of body.matchAll(/--color-([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}
const THEMES = {
  light: tokens(/:root\s*\{([^}]*)\}/),
  dark: tokens(/html\.dark\s*\{([^}]*)\}/),
};

for (const [name, t] of Object.entries(THEMES)) {
  for (const surfaceName of ["paper", "surface"] as const) {
    const bg = t[surfaceName];
    test(`${name}: text-ink/65 on ${surfaceName} meets 4.5:1 (WCAG AA text)`, () => {
      const r = ratio(blend(t.ink, bg, 0.65), bg);
      assert.ok(r >= 4.5, `ratio ${r.toFixed(2)}`);
    });
    test(`${name}: timeline upcoming ring (ink/50) on ${surfaceName} meets 3:1 (non-text)`, () => {
      const r = ratio(blend(t.ink, bg, 0.5), bg);
      assert.ok(r >= 3, `ratio ${r.toFixed(2)}`);
    });
  }
}

test("timeline problem marker is visible in light (red-600 on paper) and dark (red-400 on paper)", () => {
  assert.ok(ratio(hex("#dc2626"), THEMES.light.paper) >= 3);
  assert.ok(ratio(hex("#f87171"), THEMES.dark.paper) >= 3);
});

test("logo pill text (#1B1B18 on #FBFAF7) has very high contrast in both themes", () => {
  // The pill is a fixed light surface, independent of the theme.
  assert.ok(ratio(hex("#1B1B18"), hex("#FBFAF7")) >= 7);
});

test("admin login secondary text (slate-400 on slate-900) meets 4.5:1", () => {
  assert.ok(ratio(hex("#94a3b8"), hex("#0f172a")) >= 4.5);
});

test("product-card placeholder (slate-600 on white) meets 4.5:1", () => {
  assert.ok(ratio(hex("#475569"), hex("#ffffff")) >= 4.5);
});

// ---------- source scans ----------
const adminFiles = [...walk(join(SRC, "app/admin")), ...walk(join(SRC, "components/admin"))];

test("admin pages/components use no faint text (text-ink/10..60)", () => {
  const bad: string[] = [];
  for (const f of adminFiles) {
    for (const m of read(f).matchAll(/(?<![\w-])text-ink\/(\d+)(?![\d])/g)) {
      if (Number(m[1]) < 65) bad.push(`${rel(f)}: ${m[0]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("no fixed single-date delivery promise remains", () => {
  const hits: string[] = [];
  for (const f of walk(SRC)) {
    const s = read(f);
    if (/Delivery by\b|DELIVERY_DAYS\b|deliveryDateLabel/.test(s)) hits.push(rel(f));
  }
  assert.deepEqual(hits, []);
});

test("pure helper modules stay free of framework/alias imports (so they remain unit-testable)", () => {
  for (const f of ["lib/delivery.ts", "lib/category-tree.ts", "lib/pagination.ts"]) {
    assert.ok(!/from\s+["'](@\/|next|react)/.test(read(join(SRC, f))), f);
  }
});

test("return window and warranty come from config, not hard-coded numbers, in policy copy", () => {
  const pages = ["refund-policy", "terms", "shipping-policy"].map((p) => read(join(SRC, `app/(storefront)/${p}/page.tsx`)));
  for (const s of pages) assert.ok(!/\b(5|7)[- ]days?\b/i.test(s.replace(/\{[^}]*\}/g, "")), "hard-coded 5/7 days found");
});

test("per-page policy dates: only edited pages carry the new date", () => {
  const site = read(join(SRC, "lib/site.ts"));
  const block = site.match(/policyUpdated:\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const get = (k: string) => block.match(new RegExp(`${k}:\\s*"([^"]+)"`))?.[1];
  assert.equal(get("privacy"), "12 October 2026");
  assert.equal(get("contact"), "12 October 2026");
  for (const k of ["shipping", "refund", "terms"]) assert.equal(get(k), "25 October 2026", k);
});
