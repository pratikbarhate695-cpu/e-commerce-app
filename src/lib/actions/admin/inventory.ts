"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { inventoryAdjustSchema } from "@/lib/validation/admin";
import { adjustStock } from "@/lib/inventory";
import type { AdminActionResult } from "@/lib/actions/admin/products";

export async function adjustProductStock(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = inventoryAdjustSchema.safeParse({
    productId: formData.get("productId"),
    quantityChanged: formData.get("quantityChanged"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await prisma.$transaction((tx) =>
      adjustStock(
        tx,
        parsed.data.productId,
        parsed.data.quantityChanged,
        parsed.data.reason,
        admin.id
      )
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not adjust stock.",
    };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  return { ok: true };
}
