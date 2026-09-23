"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/actions/require-admin";
import { addToCartSchema, updateCartItemSchema } from "@/lib/validation/cart";

const NOT_AUTHORIZED = "Not authorized.";

async function getOrCreateCartId(userId: string) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return cart.id;
}

export type CartActionResult = { ok: true } | { ok: false; error: string };

export async function addToCart(formData: FormData): Promise<CartActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: NOT_AUTHORIZED };
    throw err;
  }

  const parsed = addToCartSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product || !product.isActive) {
    return { ok: false, error: "This product is not available." };
  }

  const cartId = await getOrCreateCartId(user.id);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId: product.id } },
  });
  const nextQuantity = (existing?.quantity ?? 0) + parsed.data.quantity;

  if (nextQuantity > product.stockQty) {
    return {
      ok: false,
      error: `Only ${product.stockQty} of "${product.name}" left in stock.`,
    };
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId: product.id } },
    update: { quantity: nextQuantity },
    create: { cartId, productId: product.id, quantity: parsed.data.quantity },
  });

  revalidatePath("/cart");
  return { ok: true };
}

export async function updateCartItem(formData: FormData): Promise<CartActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: NOT_AUTHORIZED };
    throw err;
  }

  const parsed = updateCartItemSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const cartId = await getOrCreateCartId(user.id);

  if (parsed.data.quantity === 0) {
    await prisma.cartItem.deleteMany({
      where: { cartId, productId: parsed.data.productId },
    });
    revalidatePath("/cart");
    return { ok: true };
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product || !product.isActive) {
    return { ok: false, error: "This product is not available." };
  }
  if (parsed.data.quantity > product.stockQty) {
    return {
      ok: false,
      error: `Only ${product.stockQty} of "${product.name}" left in stock.`,
    };
  }

  await prisma.cartItem.update({
    where: { cartId_productId: { cartId, productId: parsed.data.productId } },
    data: { quantity: parsed.data.quantity },
  });

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeFromCart(formData: FormData): Promise<CartActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: NOT_AUTHORIZED };
    throw err;
  }
  const productId = formData.get("productId");
  if (typeof productId !== "string" || !productId) {
    return { ok: false, error: "Missing product." };
  }

  const cartId = await getOrCreateCartId(user.id);
  await prisma.cartItem.deleteMany({ where: { cartId, productId } });

  revalidatePath("/cart");
  return { ok: true };
}

/**
 * Loads the current user's cart with product data attached, for
 * rendering and for pricing. Cross-checks stock/active status here too,
 * so the cart page can flag issues before checkout even starts.
 */
export async function getCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: { include: { images: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  return cart;
}
