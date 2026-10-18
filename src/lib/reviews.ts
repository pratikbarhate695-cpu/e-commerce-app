import { prisma } from "@/lib/prisma";

/** "Rohan Barhate" -> "Rohan B."  (customers are not shown with full names) */
export function publicName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  const first = parts[0];
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : "";
  return first + lastInitial;
}

export async function getProductFeedback(productId: string) {
  const [stats, reviews, questions] = await Promise.all([
    prisma.productReview.aggregate({
      where: { productId, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.productReview.findMany({
      where: { productId, isHidden: false },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.productQuestion.findMany({
      where: { productId, isHidden: false },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return {
    average: stats._avg.rating ?? 0,
    count: stats._count._all,
    reviews,
    questions,
  };
}

export function getUserReview(productId: string, userId: string) {
  return prisma.productReview.findUnique({
    where: { productId_userId: { productId, userId } },
    select: { id: true },
  });
}
