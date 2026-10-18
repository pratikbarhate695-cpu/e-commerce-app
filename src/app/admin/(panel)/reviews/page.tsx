import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Stars } from "@/components/storefront/stars";
import { deleteReview, setReviewHidden } from "@/lib/actions/admin/reviews";

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await prisma.productReview.findMany({
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <AdminHeader title="Reviews" />
      <div className="max-w-3xl space-y-6 p-8">
        {reviews.length === 0 && <p className="text-sm text-ink/60">No reviews yet.</p>}

        {reviews.map((r) => (
          <div key={r.id} className={`border border-ink/10 p-4 ${r.isHidden ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={r.rating} />
              {r.title && <span className="font-medium">{r.title}</span>}
              {r.isVerified && <span className="text-xs text-accent">Verified purchase</span>}
              {r.isHidden && <span className="text-xs text-red-700 dark:text-red-300">Hidden from the website</span>}
            </div>
            <p className="mt-1 text-xs text-ink/50">
              <Link href={`/product/${r.product.slug}`} className="underline">
                {r.product.name}
              </Link>{" "}
              · {r.user.name} ({r.user.email}) · {r.createdAt.toLocaleDateString("en-IN")}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm">{r.body}</p>

            {r.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.images.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
                    <Image src={img.url} alt="Customer photo" width={80} height={80} className="h-20 w-20 border border-ink/10 object-cover" />
                  </a>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-4 text-sm">
              <form action={setReviewHidden.bind(null, r.id, !r.isHidden)}>
                <button type="submit" className="underline underline-offset-4">
                  {r.isHidden ? "Show on website" : "Hide from website"}
                </button>
              </form>
              <form action={deleteReview.bind(null, r.id)}>
                <ConfirmButton message="Delete this review permanently?" className="text-red-700 underline underline-offset-4 dark:text-red-300">
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
