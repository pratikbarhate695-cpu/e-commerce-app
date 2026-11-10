import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE, clampPage, totalPagesFor } from "@/lib/pagination";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export async function listProducts(opts: {
  categorySlug?: string;
  /** Match any of these category slugs (a category plus its descendants). Wins over categorySlug. */
  categorySlugs?: string[];
  query?: string;
  page?: number;
}) {
  const requestedPage = opts.page && opts.page > 0 ? opts.page : 1;

  const where = {
    isActive: true,
    ...(opts.categorySlugs
      ? { category: { slug: { in: opts.categorySlugs } } }
      : opts.categorySlug
        ? { category: { slug: opts.categorySlug } }
        : {}),
    ...(opts.query
      ? {
          OR: [
            { name: { contains: opts.query, mode: "insensitive" as const } },
            { brand: { contains: opts.query, mode: "insensitive" as const } },
            { description: { contains: opts.query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Count first so an out-of-range page is clamped to the last real page
  // (never an empty page) before the rows are fetched.
  const total = await prisma.product.count({ where });
  const totalPages = totalPagesFor(total, PAGE_SIZE);
  const page = clampPage(requestedPage, totalPages);

  const products =
    total === 0
      ? []
      : await prisma.product.findMany({
          where,
          include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          // `id` breaks ties so products created in the same instant (e.g. a bulk
          // import) can never repeat or vanish between pages.
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        });

  return { products, total, page, pageSize: PAGE_SIZE, totalPages };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

export async function listFeaturedProducts() {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
}

export async function getStoreSettings() {
  const settings = await prisma.storeSettings.findFirst();
  if (!settings) {
    throw new Error("Store settings have not been seeded yet.");
  }
  return settings;
}
