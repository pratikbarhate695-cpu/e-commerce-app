import type { Coupon, Product, StoreSettings } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export type PricedLine = {
  productId: string;
  name: string;
  sku: string;
  unitPrice: Decimal;
  quantity: number;
  lineTotal: Decimal;
};

export type CartLineInput = {
  product: Pick<Product, "id" | "name" | "sku" | "sellingPrice" | "stockQty" | "isActive">;
  quantity: number;
};

export type CartTotals = {
  lines: PricedLine[];
  subtotal: Decimal;
  discountTotal: Decimal;
  shippingFee: Decimal;
  taxTotal: Decimal;
  grandTotal: Decimal;
  couponError?: string;
};

/**
 * Prices every line from the DB's current sellingPrice — the client may
 * send productId/quantity, but never a price. Throws if a product is
 * inactive or a requested quantity exceeds stock, so checkout can't
 * proceed on stale cart data.
 */
export function priceLines(inputs: CartLineInput[]): PricedLine[] {
  return inputs.map(({ product, quantity }) => {
    if (!product.isActive) {
      throw new PricingError(`"${product.name}" is no longer available.`);
    }
    if (quantity < 1) {
      throw new PricingError(`Invalid quantity for "${product.name}".`);
    }
    if (quantity > product.stockQty) {
      throw new PricingError(
        `Only ${product.stockQty} of "${product.name}" left in stock.`
      );
    }
    const unitPrice = product.sellingPrice;
    const lineTotal = unitPrice.mul(quantity);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice,
      quantity,
      lineTotal,
    };
  });
}

export class PricingError extends Error {}

function applyCoupon(
  subtotal: Decimal,
  coupon: Coupon | null
): { discountTotal: Decimal; error?: string } {
  if (!coupon) return { discountTotal: new Decimal(0) };

  const now = new Date();
  if (!coupon.isActive) {
    return { discountTotal: new Decimal(0), error: "This coupon is no longer active." };
  }
  if (now < coupon.startsAt || now > coupon.expiresAt) {
    return { discountTotal: new Decimal(0), error: "This coupon has expired." };
  }
  if (coupon.usageLimit !== null && coupon.timesUsed >= coupon.usageLimit) {
    return { discountTotal: new Decimal(0), error: "This coupon has reached its usage limit." };
  }
  if (subtotal.lt(coupon.minOrderValue)) {
    return {
      discountTotal: new Decimal(0),
      error: `This coupon requires a minimum order of ${coupon.minOrderValue}.`,
    };
  }

  let discount =
    coupon.type === "PERCENT"
      ? subtotal.mul(coupon.value).div(100)
      : coupon.value;

  if (coupon.maxDiscount && discount.gt(coupon.maxDiscount)) {
    discount = coupon.maxDiscount;
  }
  if (discount.gt(subtotal)) {
    discount = subtotal;
  }

  return { discountTotal: discount };
}

/**
 * Computes the full order total server-side. This is the only place
 * shipping/tax/discount math happens — checkout and admin order views
 * both call this rather than re-deriving numbers.
 */
export function computeCartTotals(
  inputs: CartLineInput[],
  settings: Pick<StoreSettings, "shippingFee" | "freeShippingThreshold" | "taxPercent">,
  coupon: Coupon | null
): CartTotals {
  const lines = priceLines(inputs);
  const subtotal = lines.reduce(
    (sum, l) => sum.add(l.lineTotal),
    new Decimal(0)
  );

  const { discountTotal, error: couponError } = applyCoupon(subtotal, coupon);

  const discountedSubtotal = subtotal.sub(discountTotal);

  const shippingFee =
    settings.freeShippingThreshold && discountedSubtotal.gte(settings.freeShippingThreshold)
      ? new Decimal(0)
      : settings.shippingFee;

  const taxTotal = discountedSubtotal.mul(settings.taxPercent).div(100);

  const grandTotal = discountedSubtotal.add(shippingFee).add(taxTotal);

  return {
    lines,
    subtotal,
    discountTotal,
    shippingFee,
    taxTotal,
    grandTotal,
    couponError,
  };
}
