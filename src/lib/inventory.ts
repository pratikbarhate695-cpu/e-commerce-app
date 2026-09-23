import "server-only";
import type { Prisma, InventoryReason } from "@prisma/client";

/**
 * Decrements (or increments, for reason=RETURNED/ADJUSTMENT with a positive
 * delta) a product's stock and writes the audit row in the same statement
 * set. Must be called with a transaction client (`tx`), never the bare
 * `prisma` client, so it always lands atomically with whatever else the
 * caller is doing (order creation, admin edit).
 */
export async function adjustStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantityChanged: number,
  reason: InventoryReason,
  adminId?: string
) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
  const newStock = product.stockQty + quantityChanged;

  if (newStock < 0) {
    throw new Error(
      `Stock adjustment would take "${product.name}" below zero.`
    );
  }

  await tx.product.update({
    where: { id: productId },
    data: { stockQty: newStock },
  });

  await tx.inventoryHistory.create({
    data: {
      productId,
      previousStock: product.stockQty,
      newStock,
      quantityChanged,
      reason,
      adminId,
    },
  });

  return newStock;
}
