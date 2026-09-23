import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Enter a full name.").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(20),
  line1: z.string().trim().min(1, "Enter an address.").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Enter a city.").max(100),
  state: z.string().trim().min(1, "Enter a state.").max(100),
  pincode: z.string().trim().min(3, "Enter a valid postal code.").max(12),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  address: addressSchema,
  paymentMethod: z.literal("COD"),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(40)
    .optional()
    .or(z.literal("")),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
