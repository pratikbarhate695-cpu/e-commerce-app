export type StockUpdateResult = {
  name: string;
  stockQty: number;
};

/** Typed signal for a stock deduction that would make inventory negative. */
export class InsufficientStockError extends Error {
  constructor(productName: string) {
    super(`Stock adjustment would take "${productName}" below zero.`);
    this.name = "InsufficientStockError";
  }
}

export type InventoryHistoryInput<Reason extends string> = {
  productId: string;
  previousStock: number;
  newStock: number;
  quantityChanged: number;
  reason: Reason;
  adminId?: string;
};

type InventoryCoreDependencies<Reason extends string> = {
  updateProductStock: (
    productId: string,
    quantityChanged: number
  ) => Promise<StockUpdateResult>;

  createInventoryHistory: (
    data: InventoryHistoryInput<Reason>
  ) => Promise<unknown>;
};

export async function adjustStockCore<Reason extends string>(
  deps: InventoryCoreDependencies<Reason>,
  productId: string,
  quantityChanged: number,
  reason: Reason,
  adminId?: string
): Promise<number> {
  const updated = await deps.updateProductStock(productId, quantityChanged);
  const newStock = updated.stockQty;

  if (newStock < 0) {
    throw new InsufficientStockError(updated.name);
  }

  await deps.createInventoryHistory({
    productId,
    previousStock: newStock - quantityChanged,
    newStock,
    quantityChanged,
    reason,
    adminId,
  });

  return newStock;
}
