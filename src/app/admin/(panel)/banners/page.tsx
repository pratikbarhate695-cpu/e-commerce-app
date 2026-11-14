import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { BannerEditor, type EditableBanner } from "@/components/admin/banner-editor";
import { BannerRow } from "@/components/admin/banner-row";
import { HERO_FRAME_CLASS, HeroCarousel } from "@/components/storefront/hero-banners";
import { selectHeroBanners, sortBanners, type BannerKind } from "@/lib/banners/rules";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  await requireAdmin();
  const rows = await prisma.homepageBanner.findMany();
  const banners: (EditableBanner & { sortOrder: number })[] = rows.map((r) => ({
    id: r.id,
    imageUrl: r.imageUrl,
    title: r.title,
    subtitle: r.subtitle,
    buttonText: r.buttonText,
    linkUrl: r.linkUrl,
    altText: r.altText,
    kind: (r.kind === "HERO" ? "HERO" : "PROMO") as BannerKind,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  }));

  const hero = sortBanners(banners.filter((b) => b.kind === "HERO"));
  const promos = sortBanners(banners.filter((b) => b.kind === "PROMO"));
  const live = selectHeroBanners(banners);

  return (
    <div>
      <AdminHeader title="Homepage banners" />
      <div className="space-y-12 px-4 py-6 sm:px-8">
        <section aria-labelledby="live-heading">
          <h2 id="live-heading" className="text-sm font-medium">Live on the homepage now</h2>
          <p className="mt-1 max-w-2xl text-xs text-ink/65">
            This is exactly what visitors see at the top of the homepage. With no published hero banner, the built-in
            hero is shown instead.
          </p>
          <div className="mt-3 overflow-hidden border border-ink/15">
            {live.length > 0 ? (
              <HeroCarousel
                slides={live.map((b) => ({ imageUrl: b.imageUrl, title: b.title, subtitle: b.subtitle, buttonText: b.buttonText, linkUrl: b.linkUrl, altText: b.altText }))}
                fallbackHeading="Featured"
              />
            ) : (
              <div className={`${HERO_FRAME_CLASS} flex items-center justify-center`}>
                <p className="px-6 text-center text-sm text-slate-300">No hero banner is published. Visitors see the built-in hero.</p>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="add-heading">
          <h2 id="add-heading" className="mb-4 text-sm font-medium">Add a banner</h2>
          <BannerEditor />
        </section>

        <section aria-labelledby="hero-heading">
          <h2 id="hero-heading" className="mb-1 text-sm font-medium">Hero banners</h2>
          <p className="mb-4 text-xs text-ink/65">Published ones rotate in this order at the top of the homepage.</p>
          <div className="space-y-4">
            {hero.map((b, i) => (
              <BannerRow key={b.id} banner={b} isFirst={i === 0} isLast={i === hero.length - 1} />
            ))}
            {hero.length === 0 && <p className="text-sm text-ink/65">No hero banners yet.</p>}
          </div>
        </section>

        <section aria-labelledby="promo-heading">
          <h2 id="promo-heading" className="mb-1 text-sm font-medium">Promotion strip</h2>
          <p className="mb-4 text-xs text-ink/65">Smaller banners shown below the hero. Banners created before hero management are here.</p>
          <div className="space-y-4">
            {promos.map((b, i) => (
              <BannerRow key={b.id} banner={b} isFirst={i === 0} isLast={i === promos.length - 1} />
            ))}
            {promos.length === 0 && <p className="text-sm text-ink/65">No promotion banners yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
