"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { bannerSchema } from "@/lib/validation/admin";
import { uploadProductImage } from "@/lib/cloudinary";
import type { AdminActionResult } from "@/lib/actions/admin/products";

export async function createBanner(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = bannerSchema.safeParse({
    linkUrl: formData.get("linkUrl") ?? "",
    title: formData.get("title") ?? "",
    sortOrder: formData.get("sortOrder") ?? "0",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return { ok: false, error: "Choose a banner image." };
  }
  const uploaded = await uploadProductImage(image);

  await prisma.homepageBanner.create({
    data: {
      imageUrl: uploaded.secureUrl,
      linkUrl: parsed.data.linkUrl || null,
      title: parsed.data.title || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true };
}

export async function setBannerActive(
  bannerId: string,
  isActive: boolean
): Promise<AdminActionResult> {
  await requireAdmin();
  await prisma.homepageBanner.update({ where: { id: bannerId }, data: { isActive } });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBanner(bannerId: string): Promise<AdminActionResult> {
  await requireAdmin();
  await prisma.homepageBanner.delete({ where: { id: bannerId } });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true };
}
