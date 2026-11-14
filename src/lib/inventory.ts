import "server-only";
import type { Prisma, InventoryReason } from "@prisma/client";
import { adjustStockCore } from "@/lib/inventory-core";

/**
 * Adjusts product stock and records inventory history.
 * Must always receive a Prisma transaction client.
 */
export async function adjustStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantityChanged: number,
  reason: InventoryReason,
  adminId?: string
): Promise<number> {
  return adjustStockCore<InventoryReason>(
    {
      updateProductStock: async (id, quantity) => {
        const updated = await tx.product.update({
          where: { id },
          data: { stockQty: { increment: quantity } },
        });

        return {
          name: updated.name,
          stockQty: updated.stockQty,
        };
      },
      createInventoryHistory: async (data) => {
        return tx.inventoryHistory.create({ data });
      },
    },
    productId,
    quantityChanged,
    reason,
    adminId
  );
}
