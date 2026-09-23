"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { productSchema } from "@/lib/validation/admin";
import { uploadProductImage } from "@/lib/cloudinary";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    brand: formData.get("brand") ?? "",
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    mrp: formData.get("mrp"),
    sellingPrice: formData.get("sellingPrice"),
    discountPct: formData.get("discountPct") ?? "0",
    stockQty: formData.get("stockQty"),
    lowStockThreshold: formData.get("lowStockThreshold") ?? "5",
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  });
}

export async function createProduct(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const [skuTaken, slugTaken] = await Promise.all([
    prisma.product.findUnique({ where: { sku: data.sku } }),
    prisma.product.findUnique({ where: { slug: data.slug } }),
  ]);
  if (skuTaken) return { ok: false, error: "That SKU is already in use." };
  if (slugTaken) return { ok: false, error: "That slug is already in use." };

  const product = await prisma.product.create({
    data: {
      sku: data.sku,
      name: data.name,
      slug: data.slug,
      brand: data.brand || null,
      categoryId: data.categoryId,
      description: data.description,
      mrp: data.mrp,
      sellingPrice: data.sellingPrice,
      discountPct: data.discountPct || 0,
      stockQty: data.stockQty,
      lowStockThreshold: data.lowStockThreshold,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
    },
  });

  if (data.stockQty > 0) {
    await prisma.inventoryHistory.create({
      data: {
        productId: product.id,
        previousStock: 0,
        newStock: data.stockQty,
        quantityChanged: data.stockQty,
        reason: "NEW_STOCK",
      },
    });
  }

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length > 0) {
    const uploaded = await Promise.all(images.map((f) => uploadProductImage(f)));
    await prisma.productImage.createMany({
      data: uploaded.map((img, i) => ({
        productId: product.id,
        url: img.secureUrl,
        sortOrder: i,
      })),
    });
  }

  revalidatePath("/admin/products");
  return { ok: true };
}

export async function updateProduct(
  productId: string,
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) return { ok: false, error: "Product not found." };

  const [skuTaken, slugTaken] = await Promise.all([
    prisma.product.findFirst({ where: { sku: data.sku, NOT: { id: productId } } }),
    prisma.product.findFirst({ where: { slug: data.slug, NOT: { id: productId } } }),
  ]);
  if (skuTaken) return { ok: false, error: "That SKU is already in use." };
  if (slugTaken) return { ok: false, error: "That slug is already in use." };

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        sku: data.sku,
        name: data.name,
        slug: data.slug,
        brand: data.brand || null,
        categoryId: data.categoryId,
        description: data.description,
        mrp: data.mrp,
        sellingPrice: data.sellingPrice,
        discountPct: data.discountPct || 0,
        lowStockThreshold: data.lowStockThreshold,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        // stockQty is deliberately NOT editable here — stock changes go
        // through the Inventory panel so every change is audited.
      },
    });
  });

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length > 0) {
    const uploaded = await Promise.all(images.map((f) => uploadProductImage(f)));
    const currentMax = await prisma.productImage.count({ where: { productId } });
    await prisma.productImage.createMany({
      data: uploaded.map((img, i) => ({
        productId,
        url: img.secureUrl,
        sortOrder: currentMax + i,
      })),
    });
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath(`/product/${data.slug}`);
  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { ok: false, error: "Image not found." };
  await prisma.productImage.delete({ where: { id: imageId } });
  revalidatePath(`/admin/products/${image.productId}/edit`);
  return { ok: true };
}

/**
 * Products are never hard-deleted once they could be referenced by an
 * order — deactivating hides them from the storefront while keeping
 * OrderItem history intact (see Phase 0's "isActive handles delete").
 */
export async function setProductActive(
  productId: string,
  isActive: boolean
): Promise<AdminActionResult> {
  await requireAdmin();
  await prisma.product.update({ where: { id: productId }, data: { isActive } });
  revalidatePath("/admin/products");
  return { ok: true };
}
