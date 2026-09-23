import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { BannerForm } from "@/components/admin/banner-form";
import { Badge } from "@/components/admin/badge";
import { ToggleActiveButton } from "@/components/admin/toggle-active-button";
import { setBannerActive } from "@/lib/actions/admin/banners";

export default async function BannersPage() {
  await requireAdmin();
  const banners = await prisma.homepageBanner.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <AdminHeader title="Homepage banners" />
      <div className="grid grid-cols-1 gap-10 px-8 py-6 sm:grid-cols-2">
        <div className="space-y-4">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center gap-4 border-b border-ink/10 pb-4">
              <Image
                src={b.imageUrl}
                alt={b.title ?? ""}
                width={96}
                height={54}
                className="h-14 w-24 object-cover"
              />
              <div className="flex-1">
                <p className="text-sm">{b.title || "Untitled"}</p>
                <p className="text-xs text-ink/40">{b.linkUrl}</p>
              </div>
              <Badge tone={b.isActive ? "good" : "neutral"}>
                {b.isActive ? "Active" : "Inactive"}
              </Badge>
              <ToggleActiveButton id={b.id} isActive={b.isActive} action={setBannerActive} />
            </div>
          ))}
          {banners.length === 0 && (
            <p className="text-sm text-ink/50">No banners yet.</p>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-sm text-ink/60">Add a banner</h2>
          <BannerForm />
        </div>
      </div>
    </div>
  );
}
