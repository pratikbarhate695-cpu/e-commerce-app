"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { categorySchema } from "@/lib/validation/admin";
import type { AdminActionResult } from "@/lib/actions/admin/products";

export async function createCategory(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    parentId: formData.get("parentId") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const slugTaken = await prisma.category.findUnique({ where: { slug: parsed.data.slug } });
  if (slugTaken) return { ok: false, error: "That slug is already in use." };

  await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      parentId: parsed.data.parentId || null,
    },
  });

  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategory(categoryId: string): Promise<AdminActionResult> {
  await requireAdmin();

  const inUse = await prisma.product.findFirst({ where: { categoryId } });
  if (inUse) {
    return {
      ok: false,
      error: "This category has products in it — move or deactivate them first.",
    };
  }
  const hasChildren = await prisma.category.findFirst({ where: { parentId: categoryId } });
  if (hasChildren) {
    return { ok: false, error: "This category has subcategories — remove those first." };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin/categories");
  return { ok: true };
}
