"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Category, Product, ProductImage } from "@prisma/client";
import {
  AdminField,
  AdminTextarea,
  AdminSelect,
  AdminCheckbox,
} from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import type { AdminActionResult } from "@/lib/actions/admin/products";
import { deleteProductImage } from "@/lib/actions/admin/products";

const initialState: AdminActionResult = { ok: true };

type Props = {
  mode: "new" | "edit";
  categories: Category[];
  product?: Product & { images: ProductImage[] };
  action: (
    state: AdminActionResult,
    formData: FormData
  ) => Promise<AdminActionResult>;
};

export function ProductForm({ mode, categories, product, action }: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(action, initialState);

  useEffect(() => {
    if (state.ok && mode === "new") {
      router.push("/admin/products");
    }
  }, [state, mode, router]);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <AdminField label="Name" name="name" required defaultValue={product?.name} />
        <AdminField label="SKU" name="sku" required defaultValue={product?.sku} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AdminField
          label="Slug"
          name="slug"
          required
          defaultValue={product?.slug}
          pattern="[a-z0-9-]+"
        />
        <AdminField label="Brand" name="brand" defaultValue={product?.brand ?? ""} />
      </div>

      <AdminSelect
        label="Category"
        name="categoryId"
        required
        defaultValue={product?.categoryId}
      >
        <option value="" disabled>
          Choose a category
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </AdminSelect>

      <AdminTextarea
        label="Description"
        name="description"
        required
        rows={4}
        defaultValue={product?.description}
      />

      <div className="grid grid-cols-3 gap-4">
        <AdminField
          label="MRP"
          name="mrp"
          required
          inputMode="decimal"
          defaultValue={product ? String(product.mrp) : undefined}
        />
        <AdminField
          label="Selling price"
          name="sellingPrice"
          required
          inputMode="decimal"
          defaultValue={product ? String(product.sellingPrice) : undefined}
        />
        <AdminField
          label="Discount %"
          name="discountPct"
          inputMode="decimal"
          defaultValue={product ? String(product.discountPct) : "0"}
        />
      </div>

      {mode === "new" ? (
        <div className="grid grid-cols-2 gap-4">
          <AdminField
            label="Initial stock"
            name="stockQty"
            type="number"
            min={0}
            required
            defaultValue={0}
          />
          <AdminField
            label="Low stock threshold"
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={5}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-ink/60">Current stock</span>
            <p className="mt-1 border border-transparent px-3 py-2 text-sm text-ink/50">
              {product?.stockQty} — adjust from the Inventory panel
            </p>
          </div>
          <AdminField
            label="Low stock threshold"
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={product?.lowStockThreshold ?? 5}
          />
        </div>
      )}

      <div className="flex gap-6">
        <AdminCheckbox label="Active" name="isActive" defaultChecked={product?.isActive ?? true} />
        <AdminCheckbox label="Featured" name="isFeatured" defaultChecked={product?.isFeatured ?? false} />
      </div>

      {mode === "edit" && product && product.images.length > 0 && (
        <div>
          <span className="text-sm text-ink/60">Current images</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {product.images.map((img) => (
              <div key={img.id} className="relative">
                <Image
                  src={img.url}
                  alt={img.altText ?? product.name}
                  width={80}
                  height={100}
                  className="h-24 w-20 object-cover"
                />
                <button
                  type="button"
                  onClick={() => deleteProductImage(img.id)}
                  className="absolute -right-2 -top-2 h-5 w-5 bg-ink text-xs text-paper"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className="text-sm text-ink/60">
          {mode === "new" ? "Images" : "Add images"}
        </span>
        <input
          type="file"
          name="images"
          accept="image/*"
          multiple
          className="mt-1 block w-full text-sm"
        />
      </label>

      {!state.ok && <p className="text-sm text-red-700">{state.error}</p>}

      <AdminSubmitButton>{mode === "new" ? "Create product" : "Save changes"}</AdminSubmitButton>
    </form>
  );
}
