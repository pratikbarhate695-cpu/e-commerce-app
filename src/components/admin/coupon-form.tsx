"use client";

import { useFormState } from "react-dom";
import { AdminField, AdminSelect, AdminCheckbox } from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import { createCoupon } from "@/lib/actions/admin/coupons";
import type { AdminActionResult } from "@/lib/actions/admin/products";

const initialState: AdminActionResult = { ok: true };

export function CouponForm() {
  const [state, formAction] = useFormState(createCoupon, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <AdminField label="Code" name="code" required placeholder="SUMMER20" />
      <div className="grid grid-cols-2 gap-4">
        <AdminSelect label="Type" name="type" defaultValue="PERCENT">
          <option value="PERCENT">Percent</option>
          <option value="FIXED">Fixed amount</option>
        </AdminSelect>
        <AdminField label="Value" name="value" required inputMode="decimal" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AdminField label="Min order value" name="minOrderValue" inputMode="decimal" defaultValue="0" />
        <AdminField label="Max discount (optional)" name="maxDiscount" inputMode="decimal" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AdminField label="Starts at" name="startsAt" type="datetime-local" required />
        <AdminField label="Expires at" name="expiresAt" type="datetime-local" required />
      </div>
      <AdminField label="Usage limit (optional)" name="usageLimit" type="number" min={1} />
      <AdminCheckbox label="Active" name="isActive" defaultChecked />
      {!state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      <AdminSubmitButton>Create coupon</AdminSubmitButton>
    </form>
  );
}
