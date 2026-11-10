import { prisma } from "@/lib/prisma";
import { buildCategoryTree, type CategoryTree } from "@/lib/category-tree";

/**
 * Loads every category plus the number of ACTIVE products assigned directly to
 * each one, and builds the shared hierarchy (see category-tree.ts). Two small
 * queries, no schema change. Throws if the database is unavailable.
 */
export async function getCategoryTree(): Promise<CategoryTree> {
  const [rows, groups] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true, parentId: true } }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { isActive: true },
      _count: { _all: true },
    }),
  ]);
  const counts = new Map(groups.map((g) => [g.categoryId, g._count._all]));
  return buildCategoryTree(rows, counts);
}

/** For navigation and footer: a database problem must never break every page. */
export async function getCategoryTreeSafe(): Promise<CategoryTree> {
  try {
    return await getCategoryTree();
  } catch {
    return buildCategoryTree([], {});
  }
}
