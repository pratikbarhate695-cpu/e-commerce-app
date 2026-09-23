import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(99), // 0 = remove
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
