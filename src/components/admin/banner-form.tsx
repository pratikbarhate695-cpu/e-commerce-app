"use client";

import { useFormState } from "react-dom";
import { AdminField, AdminCheckbox } from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import { createBanner } from "@/lib/actions/admin/banners";
import type { AdminActionResult } from "@/lib/actions/admin/products";

const initialState: AdminActionResult = { ok: true };

export function BannerForm() {
  const [state, formAction] = useFormState(createBanner, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <label className="block">
        <span className="text-sm text-ink/60">Image</span>
        <input
          type="file"
          name="image"
          accept="image/*"
          required
          className="mt-1 block w-full text-sm"
        />
      </label>
      <AdminField label="Title (optional)" name="title" />
      <AdminField label="Link URL (optional)" name="linkUrl" placeholder="/shop" />
      <AdminField label="Sort order" name="sortOrder" type="number" defaultValue={0} />
      <AdminCheckbox label="Active" name="isActive" defaultChecked />
      {!state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      <AdminSubmitButton>Add banner</AdminSubmitButton>
    </form>
  );
}
