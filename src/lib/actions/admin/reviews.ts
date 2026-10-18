"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";

function refresh(slug?: string) {
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/questions");
  if (slug) revalidatePath(`/product/${slug}`);
}

export async function setReviewHidden(id: string, hidden: boolean): Promise<void> {
  await requireAdmin();
  const r = await prisma.productReview.update({
    where: { id },
    data: { isHidden: hidden },
    include: { product: { select: { slug: true } } },
  });
  refresh(r.product.slug);
}

export async function deleteReview(id: string): Promise<void> {
  await requireAdmin();
  const r = await prisma.productReview.delete({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  refresh(r.product.slug);
}

export async function answerQuestion(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 2000);
  const q = await prisma.productQuestion.update({
    where: { id },
    data: answer ? { answer, answeredAt: new Date() } : { answer: null, answeredAt: null },
    include: { product: { select: { slug: true } } },
  });
  refresh(q.product.slug);
}

export async function setQuestionHidden(id: string, hidden: boolean): Promise<void> {
  await requireAdmin();
  const q = await prisma.productQuestion.update({
    where: { id },
    data: { isHidden: hidden },
    include: { product: { select: { slug: true } } },
  });
  refresh(q.product.slug);
}

export async function deleteQuestion(id: string): Promise<void> {
  await requireAdmin();
  const q = await prisma.productQuestion.delete({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  refresh(q.product.slug);
}
