/**
 * Category hierarchy helper (pure: no database, no framework imports).
 *
 * Why it exists: a parent category often has NO products of its own (they live
 * in its children). Counting/filtering by "the category's own products" hides
 * such parents from navigation, tiles and footers and shows empty category
 * pages. Everything that lists categories uses this helper so they agree.
 *
 * Rules:
 *  - totalCount = own active products + all descendants' active products.
 *  - A category is "visible" when totalCount > 0.
 *  - Bad data cannot hang or crash it: self-parents and parent loops are broken
 *    deterministically (the loop member with the alphabetically smallest slug
 *    becomes a top-level category); a parentId pointing at a missing category
 *    makes that category top-level. Both are reported, never thrown.
 *  - No recursion is used to build the tree, so very deep chains are safe.
 */

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export type CategoryNode = CategoryRow & {
  /** Parent after cycle/orphan repair (null = top-level). */
  effectiveParentId: string | null;
  /** Active products assigned directly to this category. */
  ownCount: number;
  /** ownCount + all descendants' ownCount. */
  totalCount: number;
  depth: number;
  children: CategoryNode[];
};

export type CategoryTree = {
  roots: CategoryNode[];
  byId: Map<string, CategoryNode>;
  bySlug: Map<string, CategoryNode>;
  /** Ids that were part of a parent loop (loop was broken). */
  cycleIds: string[];
  /** Ids whose parentId pointed at a category that does not exist. */
  orphanIds: string[];
};

type Counts = ReadonlyMap<string, number> | Readonly<Record<string, number>>;

function countFor(counts: Counts, id: string): number {
  const raw = counts instanceof Map ? counts.get(id) : (counts as Record<string, number>)[id];
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function compareNodes(a: CategoryRow, b: CategoryRow): number {
  return (
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.slug.localeCompare(b.slug)
  );
}

export function buildCategoryTree(rows: readonly CategoryRow[], ownCounts: Counts = {}): CategoryTree {
  const byId = new Map<string, CategoryNode>();
  for (const row of rows) {
    if (byId.has(row.id)) continue; // ignore duplicate ids
    const own = countFor(ownCounts, row.id);
    byId.set(row.id, {
      ...row,
      effectiveParentId: null,
      ownCount: own,
      totalCount: own,
      depth: 0,
      children: [],
    });
  }

  // 1) Resolve parents; a parent that does not exist makes the node top-level.
  const parentOf = new Map<string, string | null>();
  const orphanIds: string[] = [];
  for (const node of byId.values()) {
    let parent = node.parentId;
    if (parent && !byId.has(parent)) {
      orphanIds.push(node.id);
      parent = null;
    }
    parentOf.set(node.id, parent ?? null);
  }

  // 2) Break parent loops (including a category that is its own parent).
  const state = new Map<string, 1 | 2>(); // 1 = on current path, 2 = done
  const cycleIds = new Set<string>();
  for (const startId of byId.keys()) {
    if (state.has(startId)) continue;
    const path: string[] = [];
    let current: string | null = startId;
    while (current && !state.has(current)) {
      state.set(current, 1);
      path.push(current);
      current = parentOf.get(current) ?? null;
    }
    if (current && state.get(current) === 1) {
      const members = path.slice(path.indexOf(current));
      members.forEach((id) => cycleIds.add(id));
      const loopRoot = members.reduce((best, id) =>
        byId.get(id)!.slug < byId.get(best)!.slug ? id : best
      );
      parentOf.set(loopRoot, null);
    }
    path.forEach((id) => state.set(id, 2));
  }

  // 3) Link children / roots.
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parentId = parentOf.get(node.id) ?? null;
    node.effectiveParentId = parentId;
    if (parentId) byId.get(parentId)!.children.push(node);
    else roots.push(node);
  }
  roots.sort(compareNodes);
  for (const node of byId.values()) node.children.sort(compareNodes);

  // 4) Depth (breadth-first) and descendant totals (reverse order), no recursion.
  const order: CategoryNode[] = [];
  for (const root of roots) order.push(root);
  for (let i = 0; i < order.length; i++) {
    const node = order[i];
    for (const child of node.children) {
      child.depth = node.depth + 1;
      order.push(child);
    }
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i];
    if (node.effectiveParentId) byId.get(node.effectiveParentId)!.totalCount += node.totalCount;
  }

  const bySlug = new Map<string, CategoryNode>();
  for (const node of byId.values()) bySlug.set(node.slug, node);

  return { roots, byId, bySlug, cycleIds: [...cycleIds], orphanIds };
}

/** The category's own slug plus every descendant's slug ([] if the slug is unknown). */
export function descendantSlugs(tree: CategoryTree, slug: string): string[] {
  const start = tree.bySlug.get(slug);
  if (!start) return [];
  const slugs: string[] = [];
  const queue: CategoryNode[] = [start];
  for (let i = 0; i < queue.length; i++) {
    slugs.push(queue[i].slug);
    queue.push(...queue[i].children);
  }
  return slugs;
}

/** Ancestors from the top-level category down to (and excluding) the category itself. */
export function ancestorsOf(tree: CategoryTree, slug: string): CategoryNode[] {
  const chain: CategoryNode[] = [];
  let current = tree.bySlug.get(slug);
  while (current && current.effectiveParentId) {
    const parent = tree.byId.get(current.effectiveParentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/** Only categories that lead to at least one active product, children pruned the same way. */
export function visibleTree(tree: CategoryTree): CategoryNode[] {
  const prune = (nodes: CategoryNode[]): CategoryNode[] =>
    nodes
      .filter((n) => n.totalCount > 0)
      .map((n) => ({ ...n, children: prune(n.children) }));
  return prune(tree.roots);
}
