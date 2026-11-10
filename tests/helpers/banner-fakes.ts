import type { BannerRow } from "../../src/lib/banners/rules";
import type { BannerDb, BannerStorage } from "../../src/lib/banners/service";

export const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
export const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
export const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

/** A fake uploaded file: real bytes, so the signature check runs for real. */
export function fakeFile(opts: { type?: string; header?: number[]; size?: number } = {}): Blob {
  const header = opts.header ?? JPEG;
  const size = opts.size ?? 2048;
  const bytes = new Uint8Array(Math.max(size, header.length));
  bytes.set(header);
  return new Blob([bytes], { type: opts.type ?? "image/jpeg" });
}

export function makeRow(over: Partial<BannerRow> = {}): BannerRow {
  return {
    id: "b1",
    imageUrl: "https://res.cloudinary.com/demo/old.jpg",
    imagePublicId: "banners/old",
    linkUrl: null,
    title: "Old heading",
    subtitle: null,
    buttonText: null,
    altText: null,
    kind: "HERO",
    sortOrder: 0,
    isActive: true,
    ...over,
  };
}

export function makeWorld(initial: BannerRow[] = []) {
  const calls: string[] = [];
  const rows = new Map(initial.map((r) => [r.id, { ...r }]));
  const flags = { uploadFails: false, dbUpdateFails: false, dbCreateFails: false, storageRemoveFails: false, admin: true };
  let n = 0;

  const db: BannerDb = {
    async list() { return [...rows.values()].map((r) => ({ ...r })); },
    async get(id) { const r = rows.get(id); return r ? { ...r } : null; },
    async create(data) {
      calls.push("db.create");
      if (flags.dbCreateFails) throw new Error("db down");
      const row = { ...data, id: `new${++n}` } as BannerRow;
      rows.set(row.id, row);
      return { ...row };
    },
    async update(id, data) {
      calls.push("db.update");
      if (flags.dbUpdateFails) throw new Error("db down");
      const cur = rows.get(id);
      if (!cur) throw new Error("missing");
      const next = { ...cur, ...data };
      rows.set(id, next);
      return { ...next };
    },
    async remove(id) { calls.push("db.remove"); rows.delete(id); },
    async setOrder(ids) { calls.push("db.setOrder"); ids.forEach((id, i) => { const r = rows.get(id); if (r) r.sortOrder = i; }); },
  };

  const removed: string[] = [];
  const storage: BannerStorage = {
    async upload() {
      calls.push("storage.upload");
      if (flags.uploadFails) throw new Error("Cloudinary says: secret details that must not leak");
      return { url: `https://res.cloudinary.com/demo/new${++n}.jpg`, publicId: `banners/new${n}` };
    },
    async remove(publicId) {
      calls.push(`storage.remove:${publicId}`);
      if (flags.storageRemoveFails) throw new Error("cloudinary down");
      removed.push(publicId);
    },
  };

  const logs: string[] = [];
  const deps = {
    db,
    storage,
    requireAdmin: async () => { if (!flags.admin) throw new Error("Not authorized."); return { role: "ADMIN" }; },
    log: (m: string) => { logs.push(m); },
  };
  return { deps, rows, calls, removed, flags, logs };
}
