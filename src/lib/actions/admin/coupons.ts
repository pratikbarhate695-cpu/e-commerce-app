"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { couponSchema } from "@/lib/validation/admin";
import type { AdminActionResult } from "@/lib/actions/admin/products";

export async function createCoupon(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minOrderValue: formData.get("minOrderValue") ?? "0",
    maxDiscount: formData.get("maxDiscount") ?? "",
    startsAt: formData.get("startsAt"),
    expiresAt: formData.get("expiresAt"),
    usageLimit: formData.get("usageLimit") ?? "",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const codeTaken = await prisma.coupon.findUnique({ where: { code: data.code } });
  if (codeTaken) return { ok: false, error: "That coupon code is already in use." };

  if (data.type === "PERCENT" && Number(data.value) > 100) {
    return { ok: false, error: "A percent coupon can't exceed 100%." };
  }

  await prisma.coupon.create({
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      minOrderValue: data.minOrderValue || 0,
      maxDiscount: data.maxDiscount || null,
      startsAt: new Date(data.startsAt),
      expiresAt: new Date(data.expiresAt),
      usageLimit: data.usageLimit === "" ? null : Number(data.usageLimit),
      isActive: data.isActive,
    },
  });

  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function setCouponActive(
  couponId: string,
  isActive: boolean
): Promise<AdminActionResult> {
  await requireAdmin();
  await prisma.coupon.update({ where: { id: couponId }, data: { isActive } });
  revalidatePath("/admin/coupons");
  return { ok: true };
}
