"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { settingsSchema } from "@/lib/validation/admin";
import type { AdminActionResult } from "@/lib/actions/admin/products";

export async function updateSettings(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    storeName: formData.get("storeName"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    address: formData.get("address") ?? "",
    currency: formData.get("currency"),
    shippingFee: formData.get("shippingFee"),
    freeShippingThreshold: formData.get("freeShippingThreshold") ?? "",
    taxPercent: formData.get("taxPercent"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const existing = await prisma.storeSettings.findFirst();

  const values = {
    storeName: data.storeName,
    email: data.email || null,
    phone: data.phone || null,
    whatsapp: data.whatsapp || null,
    address: data.address || null,
    currency: data.currency,
    shippingFee: data.shippingFee,
    freeShippingThreshold: data.freeShippingThreshold || null,
    taxPercent: data.taxPercent,
  };

  if (existing) {
    await prisma.storeSettings.update({ where: { id: existing.id }, data: values });
  } else {
    await prisma.storeSettings.create({ data: values });
  }

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  return { ok: true };
}
