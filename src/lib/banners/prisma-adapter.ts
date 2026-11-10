import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteImage, uploadBannerImage } from "@/lib/cloudinary";
import { sortBanners, type BannerKind, type BannerRow } from "./rules";
import type { BannerDb, BannerStorage } from "./service";

type DbRow = {
  id: string;
  imageUrl: string;
  imagePublicId: string | null;
  linkUrl: string | null;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  altText: string | null;
  kind: string;
  sortOrder: number;
  isActive: boolean;
};

function toRow(r: DbRow): BannerRow {
  return { ...r, kind: (r.kind === "HERO" ? "HERO" : "PROMO") as BannerKind };
}

/** The real database behind the banner service. */
export const prismaBannerDb: BannerDb = {
  async list() {
    const rows = await prisma.homepageBanner.findMany();
    return sortBanners(rows.map(toRow));
  },
  async get(id) {
    const r = await prisma.homepageBanner.findUnique({ where: { id } });
    return r ? toRow(r) : null;
  },
  async create(data) {
    return toRow(await prisma.homepageBanner.create({ data }));
  },
  async update(id, data) {
    return toRow(await prisma.homepageBanner.update({ where: { id }, data }));
  },
  async remove(id) {
    await prisma.homepageBanner.delete({ where: { id } });
  },
  async setOrder(ids) {
    await prisma.$transaction(
      ids.map((id, index) => prisma.homepageBanner.update({ where: { id }, data: { sortOrder: index } }))
    );
  },
};

/** The real image storage (Cloudinary, signed on the server) behind the banner service. */
export const cloudinaryBannerStorage: BannerStorage = {
  async upload(file) {
    const { secureUrl, publicId } = await uploadBannerImage(file);
    return { url: secureUrl, publicId };
  },
  remove: deleteImage,
};
