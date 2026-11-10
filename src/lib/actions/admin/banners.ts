"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/require-admin";
import { createBannerService } from "@/lib/banners/service";
import { cloudinaryBannerStorage, prismaBannerDb } from "@/lib/banners/prisma-adapter";
import type { AdminActionResult } from "@/lib/actions/admin/products";

/**
 * Thin server-action layer. Every rule (admin check, validation, upload-before-delete)
 * lives in lib/banners/service.ts, which is unit-tested; this file only wires in the
 * real database, Cloudinary and session, and refreshes the pages.
 */
const service = createBannerService({
  db: prismaBannerDb,
  storage: cloudinaryBannerStorage,
  requireAdmin,
  log: (message, error) => console.error(message, error),
});

function refresh() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

function fieldsFrom(formData: FormData) {
  const get = (k: string) => formData.get(k) ?? "";
  return {
    kind: get("kind"),
    title: get("title"),
    subtitle: get("subtitle"),
    buttonText: get("buttonText"),
    linkUrl: get("linkUrl"),
    altText: get("altText"),
  };
}

function fileFrom(formData: FormData): File | null {
  const image = formData.get("image");
  return image instanceof File && image.size > 0 ? image : null;
}

/** "Save as draft" (intent=draft) or "Publish now" (intent=publish). Nothing goes live without publish. */
export async function createBanner(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const result = await service.create(fieldsFrom(formData), fileFrom(formData), formData.get("intent") === "publish");
  if (result.ok) refresh();
  return result.ok ? { ok: true, created: true } : result;
}

/** Edit text/link/type and optionally replace the image. Publish state is unchanged. */
export async function updateBanner(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const result = await service.update(String(formData.get("id") ?? ""), fieldsFrom(formData), fileFrom(formData));
  if (result.ok) refresh();
  return result;
}

export async function setBannerActive(bannerId: string, isActive: boolean): Promise<AdminActionResult> {
  const result = await service.setActive(bannerId, isActive);
  if (result.ok) refresh();
  return result;
}

export async function deleteBanner(bannerId: string): Promise<AdminActionResult> {
  const result = await service.remove(bannerId);
  if (result.ok) refresh();
  return result;
}

export async function moveBanner(bannerId: string, direction: "up" | "down"): Promise<AdminActionResult> {
  const result = await service.move(bannerId, direction);
  if (result.ok) refresh();
  return result;
}
