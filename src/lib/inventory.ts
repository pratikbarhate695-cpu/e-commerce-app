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
  // One atomic update (no read-then-write), so two requests can't overwrite each other.
  // If the result is below zero we throw, which rolls back the whole transaction.
  const updated = await tx.product.update({
    where: { id: productId },
    data: { stockQty: { increment: quantityChanged } },
  });
  const newStock = updated.stockQty;

  if (newStock < 0) {
    throw new Error(`Stock adjustment would take "${updated.name}" below zero.`);
  }

  await tx.inventoryHistory.create({
    data: {
      productId,
      previousStock: newStock - quantityChanged,
      newStock,
      quantityChanged,
      reason,
      adminId,
    },
  });

  return newStock;
}
