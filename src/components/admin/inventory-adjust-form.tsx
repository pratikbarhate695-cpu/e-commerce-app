"use client";

import { useFormState } from "react-dom";
import type { Product } from "@prisma/client";
import { AdminField, AdminSelect } from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import { adjustProductStock } from "@/lib/actions/admin/inventory";
import type { AdminActionResult } from "@/lib/actions/admin/products";

const initialState: AdminActionResult = { ok: true };

export function InventoryAdjustForm({ products }: { products: Product[] }) {
  const [state, formAction] = useFormState(adjustProductStock, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <AdminSelect label="Product" name="productId" required defaultValue="">
        <option value="" disabled>
          Choose a product
        </option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.stockQty} in stock)
          </option>
        ))}
      </AdminSelect>
      <AdminField
        label="Quantity change (use a negative number to remove stock)"
        name="quantityChanged"
        type="number"
        required
      />
      <AdminSelect label="Reason" name="reason" defaultValue="NEW_STOCK">
        <option value="NEW_STOCK">New stock</option>
        <option value="ADJUSTMENT">Adjustment</option>
        <option value="DAMAGED">Damaged</option>
        <option value="RETURNED">Returned</option>
      </AdminSelect>
      {!state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      <AdminSubmitButton>Apply</AdminSubmitButton>
    </form>
  );
}
