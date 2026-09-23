"use client";

import { useFormState } from "react-dom";
import type { StoreSettings } from "@prisma/client";
import { AdminField } from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import { updateSettings } from "@/lib/actions/admin/settings";
import type { AdminActionResult } from "@/lib/actions/admin/products";

const initialState: AdminActionResult | null = null;

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, formAction] = useFormState(
    (_: AdminActionResult | null, formData: FormData) => updateSettings(_ ?? { ok: true }, formData),
    initialState
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <AdminField label="Store name" name="storeName" required defaultValue={settings.storeName} />
      <div className="grid grid-cols-2 gap-4">
        <AdminField label="Email" name="email" type="email" defaultValue={settings.email ?? ""} />
        <AdminField label="Phone" name="phone" defaultValue={settings.phone ?? ""} />
      </div>
      <AdminField label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp ?? ""} />
      <AdminField label="Address" name="address" defaultValue={settings.address ?? ""} />
      <div className="grid grid-cols-2 gap-4">
        <AdminField label="Currency" name="currency" required defaultValue={settings.currency} />
        <AdminField
          label="Tax %"
          name="taxPercent"
          required
          inputMode="decimal"
          defaultValue={String(settings.taxPercent)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AdminField
          label="Shipping fee"
          name="shippingFee"
          required
          inputMode="decimal"
          defaultValue={String(settings.shippingFee)}
        />
        <AdminField
          label="Free shipping over (optional)"
          name="freeShippingThreshold"
          inputMode="decimal"
          defaultValue={settings.freeShippingThreshold ? String(settings.freeShippingThreshold) : ""}
        />
      </div>
      {state && !state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      {state && state.ok && <p className="text-sm text-accent">Saved.</p>}
      <AdminSubmitButton>Save settings</AdminSubmitButton>
    </form>
  );
}
