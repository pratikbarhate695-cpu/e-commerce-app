import test from "node:test";
import assert from "node:assert/strict";
import {
  ancestorsOf,
  buildCategoryTree,
  descendantSlugs,
  visibleTree,
  type CategoryRow,
} from "../src/lib/category-tree";

const row = (id: string, name: string, parentId: string | null = null): CategoryRow => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  parentId,
});

// Synthetic store: Electronics (no direct products) > Phones (3), Tablets (2) ;
// Audio (1 direct) > Earbuds (4) ; Chargers (2 direct, flat) ; Empty Parent > Empty Child (0)
const rows = [
  row("e", "Electronics"),
  row("p", "Phones", "e"),
  row("t", "Tablets", "e"),
  row("a", "Audio"),
  row("b", "Earbuds", "a"),
  row("c", "Chargers"),
  row("x", "Empty Parent"),
  row("y", "Empty Child", "x"),
];
const counts = new Map([["p", 3], ["t", 2], ["a", 1], ["b", 4], ["c", 2]]);

test("parent with products ONLY in children is counted and visible", () => {
  const tree = buildCategoryTree(rows, counts);
  const electronics = tree.byId.get("e")!;
  assert.equal(electronics.ownCount, 0);
  assert.equal(electronics.totalCount, 5);
  assert.ok(visibleTree(tree).some((n) => n.slug === "electronics"));
});

test("parent with direct AND child products sums both", () => {
  const audio = buildCategoryTree(rows, counts).byId.get("a")!;
  assert.equal(audio.ownCount, 1);
  assert.equal(audio.totalCount, 5);
});

test("flat category keeps its own count", () => {
  const chargers = buildCategoryTree(rows, counts).byId.get("c")!;
  assert.equal(chargers.totalCount, 2);
  assert.equal(chargers.children.length, 0);
});

test("categories with no products anywhere are hidden, including their children", () => {
  const slugs = visibleTree(buildCategoryTree(rows, counts)).map((n) => n.slug);
  assert.deepEqual(slugs, ["audio", "chargers", "electronics"]);
  assert.ok(!slugs.includes("empty-parent"));
});

test("visible children are pruned too", () => {
  const rows2 = [...rows, row("z", "Dead Branch", "e")];
  const electronics = visibleTree(buildCategoryTree(rows2, counts)).find((n) => n.slug === "electronics")!;
  assert.deepEqual(electronics.children.map((c) => c.slug), ["phones", "tablets"]);
});

test("descendantSlugs includes the category itself and all descendants", () => {
  const tree = buildCategoryTree(rows, counts);
  assert.deepEqual(descendantSlugs(tree, "electronics").sort(), ["electronics", "phones", "tablets"]);
  assert.deepEqual(descendantSlugs(tree, "phones"), ["phones"]);
  assert.deepEqual(descendantSlugs(tree, "nope"), []);
});

test("three levels roll up and ancestors are ordered top-down", () => {
  const r = [row("1", "Tech"), row("2", "Phones", "1"), row("3", "Android", "2")];
  const tree = buildCategoryTree(r, { "3": 7 });
  assert.equal(tree.byId.get("1")!.totalCount, 7);
  assert.equal(tree.byId.get("2")!.totalCount, 7);
  assert.equal(tree.byId.get("3")!.depth, 2);
  assert.deepEqual(ancestorsOf(tree, "android").map((n) => n.slug), ["tech", "phones"]);
  assert.deepEqual(descendantSlugs(tree, "tech").sort(), ["android", "phones", "tech"]);
});

test("self-parent is broken, not looped", () => {
  const tree = buildCategoryTree([row("s", "Solo", "s")], { s: 2 });
  assert.deepEqual(tree.cycleIds, ["s"]);
  assert.equal(tree.roots.length, 1);
  assert.equal(tree.roots[0].totalCount, 2);
});

test("two-category parent loop: both reachable, counts not doubled", () => {
  const r = [row("a", "Alpha", "b"), row("b", "Beta", "a")];
  const tree = buildCategoryTree(r, { a: 1, b: 2 });
  assert.deepEqual(tree.cycleIds.sort(), ["a", "b"]);
  assert.equal(tree.roots.length, 1);
  assert.equal(tree.roots[0].slug, "alpha"); // smallest slug becomes top-level
  assert.equal(tree.roots[0].totalCount, 3);
  assert.deepEqual(descendantSlugs(tree, "alpha").sort(), ["alpha", "beta"]);
});

test("loop with a branch hanging off it stays reachable", () => {
  const r = [row("a", "Alpha", "c"), row("b", "Beta", "a"), row("c", "Gamma", "b"), row("d", "Delta", "c")];
  const tree = buildCategoryTree(r, { d: 5 });
  assert.equal(tree.roots.length, 1);
  assert.equal(tree.roots[0].totalCount, 5);
  assert.equal(descendantSlugs(tree, tree.roots[0].slug).length, 4);
});

test("orphan (missing parent) becomes top-level and is reported", () => {
  const tree = buildCategoryTree([row("k", "Kept", "ghost")], { k: 1 });
  assert.deepEqual(tree.orphanIds, ["k"]);
  assert.equal(tree.roots[0].slug, "kept");
});

test("duplicate ids and bad counts are tolerated", () => {
  const tree = buildCategoryTree([row("a", "Alpha"), row("a", "Alpha Again")], { a: NaN as unknown as number });
  assert.equal(tree.byId.size, 1);
  assert.equal(tree.byId.get("a")!.totalCount, 0);
});

test("very deep chain does not overflow the stack", () => {
  const r: CategoryRow[] = [];
  for (let i = 0; i < 5000; i++) r.push(row(`n${i}`, `Cat ${i}`, i === 0 ? null : `n${i - 1}`));
  const tree = buildCategoryTree(r, { n4999: 1 });
  assert.equal(tree.roots[0].totalCount, 1);
  assert.equal(descendantSlugs(tree, "cat-0").length, 5000);
});

test("input rows are not mutated", () => {
  const input = rows.map((r) => ({ ...r }));
  const snapshot = JSON.stringify(input);
  buildCategoryTree(input, counts);
  assert.equal(JSON.stringify(input), snapshot);
});

test("roots and children are sorted by name, case-insensitively", () => {
  const r = [row("1", "banana"), row("2", "Apple"), row("3", "cherry")];
  assert.deepEqual(buildCategoryTree(r).roots.map((n) => n.name), ["Apple", "banana", "cherry"]);
});
