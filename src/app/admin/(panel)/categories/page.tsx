import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { CategoryForm } from "@/components/admin/category-form";

export default async function CategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    include: { parent: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <AdminHeader title="Categories" />
      <div className="grid grid-cols-1 gap-10 px-8 py-6 sm:grid-cols-2">
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50">
                <th className="py-2 font-normal">Name</th>
                <th className="py-2 font-normal">Parent</th>
                <th className="py-2 font-normal">Products</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-ink/5">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-ink/60">{c.parent?.name ?? "—"}</td>
                  <td className="py-2 text-ink/60">{c._count.products}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && (
            <p className="mt-4 text-sm text-ink/50">No categories yet.</p>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-sm text-ink/60">Add a category</h2>
          <CategoryForm categories={categories} />
        </div>
      </div>
    </div>
  );
}
