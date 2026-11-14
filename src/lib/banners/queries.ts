import "server-only";
import { prisma } from "@/lib/prisma";
import { selectHeroBanners, selectPromoBanners, type BannerKind } from "./rules";

export type PublicBanner = {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  altText: string | null;
  kind: BannerKind;
  sortOrder: number;
};

/**
 * Published banners for the homepage. A database problem (for example the new columns
 * not being added yet) must never break the homepage: it returns nothing, and the
 * homepage shows its built-in hero.
 */
export async function getHomepageBanners(): Promise<{ hero: PublicBanner[]; promos: PublicBanner[] }> {
  try {
    const rows = await prisma.homepageBanner.findMany({
      where: { isActive: true },
      select: {
        id: true, imageUrl: true, linkUrl: true, title: true, subtitle: true,
        buttonText: true, altText: true, kind: true, sortOrder: true, isActive: true,
      },
    });
    const normal = rows.map((r) => ({ ...r, kind: (r.kind === "HERO" ? "HERO" : "PROMO") as BannerKind }));
    return { hero: selectHeroBanners(normal), promos: selectPromoBanners(normal) };
  } catch (err) {
    console.error("Homepage banners unavailable, using the built-in hero", err);
    return { hero: [], promos: [] };
  }
}
