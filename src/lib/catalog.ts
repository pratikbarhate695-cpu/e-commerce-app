import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 24;

export async function listProducts(opts: {
  categorySlug?: string;
  query?: string;
  page?: number;
}) {
  const page = opts.page && opts.page > 0 ? opts.page : 1;

  const where = {
    isActive: true,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
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

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, pageSize: PAGE_SIZE };
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
