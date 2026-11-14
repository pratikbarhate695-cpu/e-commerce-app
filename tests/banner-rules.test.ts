import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_IMAGE_BYTES,
  checkImageFile,
  checkImageMeta,
  isSafeLink,
  parseBannerFields,
  planMove,
  selectHeroBanners,
  selectPromoBanners,
  slideButton,
  sniffImageType,
} from "../src/lib/banners/rules";
import { JPEG, PNG, WEBP, fakeFile } from "./helpers/banner-fakes";

test("image validation: accepts real JPG, PNG and WebP", async () => {
  for (const [type, header] of [["image/jpeg", JPEG], ["image/png", PNG], ["image/webp", WEBP]] as const) {
    const r = await checkImageFile(fakeFile({ type, header: [...header] }));
    assert.equal(r.ok, true, type);
  }
});

test("image validation: rejects wrong types (gif, svg, pdf, empty)", () => {
  for (const type of ["image/gif", "image/svg+xml", "application/pdf", "text/html", ""]) {
    assert.equal(checkImageMeta({ type, size: 1000 }).ok, false, type);
  }
  assert.equal(checkImageMeta({ type: "image/jpeg", size: 0 }).ok, false);
});

test("image validation: size limit is enforced at exactly the boundary", () => {
  assert.equal(checkImageMeta({ type: "image/jpeg", size: MAX_IMAGE_BYTES }).ok, true);
  const over = checkImageMeta({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 });
  assert.equal(over.ok, false);
});

test("image validation: a file that only CLAIMS to be an image is rejected (HTML renamed .jpg)", async () => {
  const html = new Blob(["<script>alert(1)</script>"], { type: "image/jpeg" });
  const r = await checkImageFile(html);
  assert.equal(r.ok, false);
});

test("image validation: declared type must match the real signature", async () => {
  const r = await checkImageFile(fakeFile({ type: "image/png", header: [...JPEG] }));
  assert.equal(r.ok, false);
  assert.equal(sniffImageType(new Uint8Array([1, 2, 3])), null);
});

test("links: only site paths and https are allowed", () => {
  for (const ok of ["/shop", "/category/phones?x=1", "https://example.com/a"]) assert.equal(isSafeLink(ok), true, ok);
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.com", "http://example.com", "shop", "/a b", "/\\evil.com", "https://"]) {
    assert.equal(isSafeLink(bad), false, bad);
  }
});

test("fields: trims, enforces limits, defaults type to HERO, empty becomes null", () => {
  const r = parseBannerFields({ title: "  Big sale  ", subtitle: "", buttonText: " Shop ", linkUrl: "/shop", altText: "" });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.value, { kind: "HERO", title: "Big sale", subtitle: null, buttonText: "Shop", linkUrl: "/shop", altText: null });
  }
  assert.equal(parseBannerFields({ title: "x".repeat(81) }).ok, false);
  assert.equal(parseBannerFields({ subtitle: "x".repeat(201) }).ok, false);
  assert.equal(parseBannerFields({ buttonText: "x".repeat(31), linkUrl: "/a" }).ok, false);
  assert.equal(parseBannerFields({ kind: "SIDEBAR" }).ok, false);
});

test("fields: bad link and button-without-link are rejected with a clear message", () => {
  const bad = parseBannerFields({ linkUrl: "javascript:alert(1)" });
  assert.equal(bad.ok, false);
  const noLink = parseBannerFields({ buttonText: "Shop now" });
  assert.equal(noLink.ok, false);
});

test("homepage selection: only published HERO banners, in admin order; drafts never shown", () => {
  const rows = [
    { id: "c", kind: "HERO", isActive: true, sortOrder: 2 },
    { id: "a", kind: "HERO", isActive: true, sortOrder: 0 },
    { id: "draft", kind: "HERO", isActive: false, sortOrder: 1 },
    { id: "promo", kind: "PROMO", isActive: true, sortOrder: 0 },
    { id: "b", kind: "HERO", isActive: true, sortOrder: 1 },
  ];
  assert.deepEqual(selectHeroBanners(rows).map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(selectPromoBanners(rows).map((r) => r.id), ["promo"]);
});

test("homepage selection: old rows (no kind / PROMO) stay in the promotion strip, never the hero", () => {
  const legacy = [{ id: "old", kind: "PROMO", isActive: true, sortOrder: 0 }];
  assert.equal(selectHeroBanners(legacy).length, 0);
  assert.equal(selectPromoBanners(legacy).length, 1);
});

test("reorder: moves one step, refuses at the edges and for unknown ids", () => {
  assert.deepEqual(planMove(["a", "b", "c"], "b", "up"), ["b", "a", "c"]);
  assert.deepEqual(planMove(["a", "b", "c"], "b", "down"), ["a", "c", "b"]);
  assert.equal(planMove(["a", "b", "c"], "a", "up"), null);
  assert.equal(planMove(["a", "b", "c"], "c", "down"), null);
  assert.equal(planMove(["a"], "zzz", "up"), null);
});

test("button: shown only with a link; text defaults to 'Shop now'", () => {
  assert.equal(slideButton({ linkUrl: null, buttonText: "Hi" }), null);
  assert.deepEqual(slideButton({ linkUrl: "/shop", buttonText: null }), { href: "/shop", label: "Shop now" });
  assert.deepEqual(slideButton({ linkUrl: "/shop", buttonText: "See deals" }), { href: "/shop", label: "See deals" });
});
