"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { productSchema } from "@/lib/validation/admin";
import { deleteImage, uploadProductImage } from "@/lib/cloudinary";
import { checkImageFile } from "@/lib/banners/rules";

export type AdminActionResult = { ok: true; created?: boolean } | { ok: false; error: string };

const MAX_PRODUCT_IMAGES = 10;
const MAX_PRODUCT_IMAGE_BYTES = 4 * 1024 * 1024;

async function validateProductImages(images: File[]): Promise<string | null> {
  if (images.length > MAX_PRODUCT_IMAGES) {
    return `You can upload up to ${MAX_PRODUCT_IMAGES} product images.`;
  }
  if (images.reduce((total, file) => total + file.size, 0) > MAX_PRODUCT_IMAGE_BYTES) {
    return "Product images must total 4 MB or less. Please choose smaller images.";
  }
  for (const file of images) {
    const result = await checkImageFile(file);
    if (!result.ok) return result.error;
  }
  return null;
}

type UploadedProductImage = Awaited<ReturnType<typeof uploadProductImage>>;

async function discardUploadedImages(images: UploadedProductImage[]) {
  await Promise.allSettled(images.map((image) => deleteImage(image.publicId)));
}

async function uploadProductImages(
  files: File[]
): Promise<{ ok: true; images: UploadedProductImage[] } | { ok: false; error: string }> {
  const results = await Promise.allSettled(files.map((file) => uploadProductImage(file)));
  const uploaded = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  const failed = results.find((result) => result.status === "rejected");

  if (failed) {
    await discardUploadedImages(uploaded);
    console.error("Product image upload failed", failed.reason);
    return {
      ok: false,
      error: "Product images could not be uploaded. Check Cloudinary settings and try again.",
    };
  }

  return { ok: true, images: uploaded };
}

/** One bullet per line. Blank lines removed, max 12 bullets of 160 characters. */
function parseHighlights(formData: FormData): string[] {
  return String(formData.get("highlights") ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-•*]+/, "").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => line.slice(0, 160));
}

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

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const imageError = await validateProductImages(images);
  if (imageError) return { ok: false, error: imageError };

  const uploadResult = await uploadProductImages(images);
  if (!uploadResult.ok) return { ok: false, error: uploadResult.error };
  const uploaded = uploadResult.images;

  let product: Awaited<ReturnType<typeof prisma.product.create>>;
  try {
    product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
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
          highlights: parseHighlights(formData),
        },
      });

      if (data.stockQty > 0) {
        await tx.inventoryHistory.create({
          data: {
            productId: created.id,
            previousStock: 0,
            newStock: data.stockQty,
            quantityChanged: data.stockQty,
            reason: "NEW_STOCK",
          },
        });
      }

      if (uploaded.length > 0) {
        await tx.productImage.createMany({
          data: uploaded.map((image, index) => ({
            productId: created.id,
            url: image.secureUrl,
            sortOrder: index,
          })),
        });
      }

      return created;
    });
  } catch (error) {
    await discardUploadedImages(uploaded);
    console.error("Product creation failed", error);
    return {
      ok: false,
      error: "Could not create the product. Check the SKU, slug and category, then try again.",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath(`/product/${data.slug}`);
  return { ok: true, created: true };
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

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const imageError = await validateProductImages(images);
  if (imageError) return { ok: false, error: imageError };

  const uploadResult = await uploadProductImages(images);
  if (!uploadResult.ok) return { ok: false, error: uploadResult.error };
  const uploaded = uploadResult.images;

  try {
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
          highlights: parseHighlights(formData),
          // stockQty is deliberately NOT editable here — stock changes go
          // through the Inventory panel so every change is audited.
        },
      });

      if (uploaded.length > 0) {
        const currentMax = await tx.productImage.count({ where: { productId } });
        await tx.productImage.createMany({
          data: uploaded.map((image, index) => ({
            productId,
            url: image.secureUrl,
            sortOrder: currentMax + index,
          })),
        });
      }
    });
  } catch (error) {
    await discardUploadedImages(uploaded);
    console.error("Product update failed", error);
    return {
      ok: false,
      error: "Could not save the product changes. Please check the details and try again.",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath(`/product/${existing.slug}`);
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
