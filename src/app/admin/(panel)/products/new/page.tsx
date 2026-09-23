import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/admin/products";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <AdminHeader title="New product" />
      <div className="px-8 py-6">
        <ProductForm mode="new" categories={categories} action={createProduct} />
      </div>
    </div>
  );
}
