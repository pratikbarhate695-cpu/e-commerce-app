import test from "node:test";
import assert from "node:assert/strict";
import {
  adjustStockCore,
  InsufficientStockError,
} from "../src/lib/inventory-core";

type Reason = "NEW_STOCK" | "SALE" | "ADJUSTMENT" | "DAMAGED" | "RETURNED";

function makeWorld(initialStock: number, name = "Test Product") {
  let stock = initialStock;

  const updates: Array<{ productId: string; quantityChanged: number }> = [];
  const history: Array<{
    productId: string;
    previousStock: number;
    newStock: number;
    quantityChanged: number;
    reason: Reason;
    adminId?: string;
  }> = [];

  const deps = {
    updateProductStock: async (productId: string, quantityChanged: number) => {
      updates.push({ productId, quantityChanged });
      stock += quantityChanged;
      return { name, stockQty: stock };
    },
    createInventoryHistory: async (data: {
      productId: string;
      previousStock: number;
      newStock: number;
      quantityChanged: number;
      reason: Reason;
      adminId?: string;
    }) => {
      history.push(data);
    },
  };

  return {
    deps,
    updates,
    history,
    getStock: () => stock,
  };
}

test("sale: deducts stock and records accurate history", async () => {
  const w = makeWorld(10);

  const result = await adjustStockCore(
    w.deps, "product-1", -3, "SALE"
  );

  assert.equal(result, 7);
  assert.equal(w.getStock(), 7);
  assert.deepEqual(w.history, [{
    productId: "product-1",
    previousStock: 10,
    newStock: 7,
    quantityChanged: -3,
    reason: "SALE",
    adminId: undefined,
  }]);
});

test("new stock: increments stock and records accurate history", async () => {
  const w = makeWorld(5);

  const result = await adjustStockCore(
    w.deps, "product-1", 8, "NEW_STOCK", "admin-1"
  );

  assert.equal(result, 13);
  assert.equal(w.getStock(), 13);
  assert.equal(w.history[0].previousStock, 5);
  assert.equal(w.history[0].newStock, 13);
  assert.equal(w.history[0].quantityChanged, 8);
  assert.equal(w.history[0].adminId, "admin-1");
});

test("returned stock: allows a positive stock adjustment", async () => {
  const w = makeWorld(2);

  const result = await adjustStockCore(
    w.deps, "product-1", 1, "RETURNED"
  );

  assert.equal(result, 3);
  assert.equal(w.history[0].reason, "RETURNED");
});

test("damaged stock: deducts stock and records DAMAGED reason", async () => {
  const w = makeWorld(6);

  const result = await adjustStockCore(
    w.deps, "product-1", -2, "DAMAGED"
  );

  assert.equal(result, 4);
  assert.equal(w.history[0].reason, "DAMAGED");
});

test("manual adjustment: records ADJUSTMENT reason", async () => {
  const w = makeWorld(10);

  const result = await adjustStockCore(
    w.deps, "product-1", 2, "ADJUSTMENT"
  );

  assert.equal(result, 12);
  assert.equal(w.history[0].reason, "ADJUSTMENT");
});

test("rejects a deduction that would make stock negative", async () => {
  const w = makeWorld(2, "Headphones");

  await assert.rejects(
    adjustStockCore(w.deps, "product-1", -5, "SALE"),
    (error: unknown) =>
      error instanceof InsufficientStockError &&
      /Headphones.*below zero/.test(error.message)
  );

  assert.equal(w.history.length, 0);
  assert.equal(w.getStock(), -3);
});

test("passes the correct product ID and quantity to the stock update", async () => {
  const w = makeWorld(20);

  await adjustStockCore(
    w.deps, "product-xyz", -4, "SALE"
  );

  assert.deepEqual(w.updates, [{
    productId: "product-xyz",
    quantityChanged: -4,
  }]);
});

test("does not create history if the stock update fails", async () => {
  const w = makeWorld(10);
  w.deps.updateProductStock = async () => {
    throw new Error("Database update failed");
  };

  await assert.rejects(
    adjustStockCore(w.deps, "product-1", -2, "SALE"),
    /Database update failed/
  );

  assert.equal(w.history.length, 0);
});
