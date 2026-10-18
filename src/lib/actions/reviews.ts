"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/actions/require-admin";
import { uploadReviewImage } from "@/lib/cloudinary";

export type FeedbackResult = { ok: true; message?: string } | { ok: false; error: string };

const MAX_REVIEW_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// A review counts as "verified purchase" if the customer has an order with this product
// that is confirmed or further along (not pending or cancelled).
const BOUGHT_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

async function signedInUser() {
  try {
    return await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return null;
    throw err;
  }
}

export async function submitReview(
  productId: string,
  _prev: FeedbackResult,
  formData: FormData
): Promise<FeedbackResult> {
  const user = await signedInUser();
  if (!user) return { ok: false, error: "Please sign in to write a review." };

  const rating = Number(formData.get("rating"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Please choose a star rating." };
  }
  if (body.length < 10) return { ok: false, error: "Please write at least 10 characters." };
  if (body.length > 2000) return { ok: false, error: "Your review is too long (max 2000 characters)." };

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, slug: true },
  });
  if (!product) return { ok: false, error: "This product is not available." };

  const already = await prisma.productReview.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
    select: { id: true },
  });
  if (already) return { ok: false, error: "You have already reviewed this product." };

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_REVIEW_IMAGES) {
    return { ok: false, error: `You can add up to ${MAX_REVIEW_IMAGES} photos.` };
  }
  for (const f of files) {
    if (!f.type.startsWith("image/")) return { ok: false, error: "Only image files are allowed." };
    if (f.size > MAX_IMAGE_BYTES) return { ok: false, error: "Each photo must be under 5 MB." };
  }

  let uploaded: { secureUrl: string }[] = [];
  if (files.length > 0) {
    try {
      uploaded = await Promise.all(files.map((f) => uploadReviewImage(f)));
    } catch (err) {
      console.error("Review image upload failed", err);
      return { ok: false, error: "Photos could not be uploaded right now. Try again, or post without photos." };
    }
  }

  const bought = await prisma.order.findFirst({
    where: {
      userId: user.id,
      status: { in: [...BOUGHT_STATUSES] },
      items: { some: { productId } },
    },
    select: { id: true },
  });

  try {
    await prisma.productReview.create({
      data: {
        productId,
        userId: user.id,
        rating,
        title: title || null,
        body,
        isVerified: Boolean(bought),
        images: {
          create: uploaded.map((img, i) => ({ url: img.secureUrl, sortOrder: i })),
        },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "You have already reviewed this product." };
    }
    throw err;
  }

  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/admin/reviews");
  return { ok: true, message: "Thank you! Your review has been posted." };
}

export async function submitQuestion(
  productId: string,
  _prev: FeedbackResult,
  formData: FormData
): Promise<FeedbackResult> {
  const user = await signedInUser();
  if (!user) return { ok: false, error: "Please sign in to ask a question." };

  const question = String(formData.get("question") ?? "").trim();
  if (question.length < 1) return { ok: false, error: "Please type your question." };
  if (question.length > 500) return { ok: false, error: "Your question is too long (max 500 characters)." };

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, slug: true },
  });
  if (!product) return { ok: false, error: "This product is not available." };

  // Simple spam limit: 3 questions per product per day.
  const recent = await prisma.productQuestion.count({
    where: {
      productId,
      userId: user.id,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent >= 3) {
    return { ok: false, error: "You have asked several questions today. Please try again tomorrow." };
  }

  await prisma.productQuestion.create({
    data: { productId, userId: user.id, question },
  });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/admin/questions");
  return { ok: true, message: "Thanks! We will answer your question soon." };
}
