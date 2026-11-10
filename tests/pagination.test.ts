import test from "node:test";
import assert from "node:assert/strict";
import {
  clampPage,
  itemRange,
  pageHref,
  pageWindow,
  parsePageParam,
  totalPagesFor,
} from "../src/lib/pagination";

test("parsePageParam: valid positive integers", () => {
  assert.equal(parsePageParam("1"), 1);
  assert.equal(parsePageParam("2"), 2);
  assert.equal(parsePageParam("  7 "), 7);
  assert.equal(parsePageParam("007"), 7);
});

test("parsePageParam: everything invalid becomes page 1", () => {
  for (const bad of [undefined, null, "", " ", "0", "-1", "-5", "abc", "2.5", "1e3", "0x10", "+3", "NaN", "Infinity", "1 2", "2abc", "٣"]) {
    assert.equal(parsePageParam(bad as string | undefined), 1, `input ${String(bad)}`);
  }
});

test("parsePageParam: repeated ?page=2&page=3 uses the first; huge values stay finite", () => {
  assert.equal(parsePageParam(["2", "3"]), 2);
  assert.equal(parsePageParam([]), 1);
  assert.equal(parsePageParam("99999999999999999999999"), 1); // too long: rejected, not overflowed
  assert.ok(Number.isFinite(parsePageParam("999999999999")));
});

test("totalPagesFor: boundaries around 24 per page", () => {
  assert.equal(totalPagesFor(0, 24), 1);
  assert.equal(totalPagesFor(1, 24), 1);
  assert.equal(totalPagesFor(24, 24), 1);
  assert.equal(totalPagesFor(25, 24), 2);
  assert.equal(totalPagesFor(48, 24), 2);
  assert.equal(totalPagesFor(49, 24), 3);
  assert.equal(totalPagesFor(61, 24), 3);
});

test("totalPagesFor: bad inputs never produce 0, NaN or Infinity pages", () => {
  assert.equal(totalPagesFor(-5, 24), 1);
  assert.equal(totalPagesFor(NaN, 24), 1);
  assert.equal(totalPagesFor(30, 0), 2); // falls back to 24
  assert.equal(totalPagesFor(30, NaN), 2);
});

test("clampPage: out-of-range pages land on a real page", () => {
  assert.equal(clampPage(0, 3), 1);
  assert.equal(clampPage(-4, 3), 1);
  assert.equal(clampPage(2, 3), 2);
  assert.equal(clampPage(3, 3), 3);
  assert.equal(clampPage(4, 3), 3);
  assert.equal(clampPage(1_000_000_000, 3), 3);
  assert.equal(clampPage(NaN, 3), 1);
  assert.equal(clampPage(5, 0), 1);
});

test("every product is reachable: pages cover 1..total exactly once", () => {
  for (const total of [0, 1, 23, 24, 25, 47, 48, 49, 100, 1001]) {
    const pages = totalPagesFor(total, 24);
    const seen: number[] = [];
    for (let p = 1; p <= pages; p++) {
      const { from, to } = itemRange(p, 24, total);
      if (to === 0) continue; // empty result: 0-0 is a display value, not an item
      for (let i = from; i <= to; i++) seen.push(i);
    }
    assert.equal(seen.length, total, `total ${total}`);
    assert.deepEqual(seen, Array.from({ length: total }, (_, i) => i + 1));
  }
});

test("itemRange: empty result is 0-0", () => {
  assert.deepEqual(itemRange(1, 24, 0), { from: 0, to: 0 });
  assert.deepEqual(itemRange(2, 24, 30), { from: 25, to: 30 });
});

test("pageHref: page 1 has no page param; other filters are preserved", () => {
  assert.equal(pageHref("/shop", {}, 1), "/shop");
  assert.equal(pageHref("/shop", {}, 2), "/shop?page=2");
  assert.equal(pageHref("/search", { q: "galaxy buds" }, 1), "/search?q=galaxy+buds");
  assert.equal(pageHref("/search", { q: "galaxy buds" }, 3), "/search?q=galaxy+buds&page=3");
  assert.equal(pageHref("/category/phones", {}, 2), "/category/phones?page=2");
});

test("pageHref: encodes unsafe characters and ignores empty / old page params", () => {
  assert.equal(pageHref("/search", { q: "a&b=c#d" }, 2), "/search?q=a%26b%3Dc%23d&page=2");
  assert.equal(pageHref("/search", { q: "" }, 2), "/search?page=2");
  assert.equal(pageHref("/search", { q: "tv", page: "9" }, 2), "/search?q=tv&page=2");
  assert.equal(pageHref("/search", { q: "ट्यूब" }, 1), "/search?q=%E0%A4%9F%E0%A5%8D%E0%A4%AF%E0%A5%82%E0%A4%AC");
});

test("pageWindow: small sets show everything; large sets use gaps", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(1, 20), [1, 2, "gap", 20]);
  assert.deepEqual(pageWindow(10, 20), [1, "gap", 9, 10, 11, "gap", 20]);
  assert.deepEqual(pageWindow(20, 20), [1, "gap", 19, 20]);
  assert.deepEqual(pageWindow(3, 8), [1, 2, 3, 4, "gap", 8]);
});
