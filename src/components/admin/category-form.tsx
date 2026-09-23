"use client";

import { useFormState } from "react-dom";
import type { Category } from "@prisma/client";
import { AdminField, AdminSelect } from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import { createCategory } from "@/lib/actions/admin/categories";
import type { AdminActionResult } from "@/lib/actions/admin/products";

const initialState: AdminActionResult = { ok: true };

export function CategoryForm({ categories }: { categories: Category[] }) {
  const [state, formAction] = useFormState(createCategory, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <AdminField label="Name" name="name" required />
      <AdminField label="Slug" name="slug" required pattern="[a-z0-9-]+" />
      <AdminSelect label="Parent category (optional)" name="parentId" defaultValue="">
        <option value="">None</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </AdminSelect>
      {!state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      <AdminSubmitButton>Add category</AdminSubmitButton>
    </form>
  );
}
