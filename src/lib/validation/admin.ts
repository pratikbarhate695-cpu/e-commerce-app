import { z } from "zod";

const decimalString = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid non-negative number.");

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required.").max(60),
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  brand: z.string().trim().max(120).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Choose a category."),
  description: z.string().trim().min(1, "Description is required.").max(5000),
  mrp: decimalString,
  sellingPrice: decimalString,
  discountPct: decimalString.optional().or(z.literal("")),
  stockQty: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
});
export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  parentId: z.string().optional().or(z.literal("")),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Code must be at least 3 characters.")
      .max(40),
    type: z.enum(["PERCENT", "FIXED"]),
    value: decimalString,
    minOrderValue: decimalString.optional().or(z.literal("")),
    maxDiscount: decimalString.optional().or(z.literal("")),
    startsAt: z.string().min(1, "Start date is required."),
    expiresAt: z.string().min(1, "Expiry date is required."),
    usageLimit: z.coerce.number().int().min(1).optional().or(z.literal("")),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((data) => new Date(data.expiresAt) > new Date(data.startsAt), {
    message: "Expiry must be after the start date.",
    path: ["expiresAt"],
  });
export type CouponInput = z.infer<typeof couponSchema>;

export const bannerSchema = z.object({
  linkUrl: z.string().trim().max(300).optional().or(z.literal("")),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});
export type BannerInput = z.infer<typeof bannerSchema>;

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required.").max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  currency: z.string().trim().min(1).max(10),
  shippingFee: decimalString,
  freeShippingThreshold: decimalString.optional().or(z.literal("")),
  taxPercent: decimalString,
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const inventoryAdjustSchema = z.object({
  productId: z.string().min(1),
  quantityChanged: z.coerce.number().int().refine((v) => v !== 0, "Enter a non-zero amount."),
  reason: z.enum(["NEW_STOCK", "ADJUSTMENT", "DAMAGED", "RETURNED"]),
});
export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>;

export const orderStatusOptions = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const orderStatusUpdateSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(orderStatusOptions),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
