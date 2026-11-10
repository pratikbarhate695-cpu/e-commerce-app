/**
 * Banner management service.
 *
 * All the rules of the feature live here: who may do what, validation order, and the
 * guarantee that an existing image is never deleted until its replacement is safely
 * stored. The database, image storage and admin check are injected, so the server
 * actions pass the real Prisma / Cloudinary / session code and the tests pass fakes.
 *
 * Dependency-free apart from ./rules (no framework or alias imports).
 */
import {
  checkImageFile,
  parseBannerFields,
  planMove,
  sortBanners,
  type BannerFields,
  type BannerRow,
} from "./rules";

export type BannerDb = {
  list(): Promise<BannerRow[]>;
  get(id: string): Promise<BannerRow | null>;
  create(data: Omit<BannerRow, "id">): Promise<BannerRow>;
  update(id: string, data: Partial<Omit<BannerRow, "id">>): Promise<BannerRow>;
  remove(id: string): Promise<void>;
  /** Saves sortOrder = position for every id, in one transaction. */
  setOrder(ids: string[]): Promise<void>;
};

export type StoredImage = { url: string; publicId: string };

export type BannerStorage = {
  upload(file: Blob): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
};

export type BannerDeps = {
  db: BannerDb;
  storage: BannerStorage;
  /** Must throw / reject unless the caller is a signed-in administrator. */
  requireAdmin(): Promise<unknown>;
  log?(message: string, error?: unknown): void;
};

export type ServiceResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const MESSAGES = {
  unauthorized: "Not authorized.",
  notFound: "That banner no longer exists.",
  uploadFailed: "The image could not be uploaded. Nothing was changed. Please try again.",
  saveFailed: "Something went wrong and nothing was changed. Please try again.",
  needImage: "Choose a banner image.",
} as const;

export function createBannerService(deps: BannerDeps) {
  const log = deps.log ?? (() => {});

  async function guard(): Promise<boolean> {
    try {
      await deps.requireAdmin();
      return true;
    } catch {
      return false; // fail closed: any problem identifying an admin means "no"
    }
  }

  async function removeAssetQuietly(publicId: string | null | undefined, why: string) {
    if (!publicId) return;
    try {
      await deps.storage.remove(publicId);
    } catch (err) {
      // A leftover file in Cloudinary is harmless; failing the admin's request is not useful.
      log(`Could not delete Cloudinary image (${why})`, err);
    }
  }

  async function nextSortOrder(kind: string): Promise<number> {
    const rows = await deps.db.list();
    const same = rows.filter((r) => r.kind === kind);
    return same.length === 0 ? 0 : Math.max(...same.map((r) => r.sortOrder)) + 1;
  }

  /** Create a banner. It is a draft (not on the homepage) unless `publish` is true. */
  async function create(
    rawFields: Record<string, unknown>,
    file: Blob | null,
    publish: boolean
  ): Promise<ServiceResult<{ id: string }>> {
    if (!(await guard())) return { ok: false, error: MESSAGES.unauthorized };

    const fields = parseBannerFields(rawFields);
    if (!fields.ok) return fields;
    if (!file || file.size === 0) return { ok: false, error: MESSAGES.needImage };
    const check = await checkImageFile(file);
    if (!check.ok) return check;

    let stored: StoredImage;
    try {
      stored = await deps.storage.upload(file);
    } catch (err) {
      log("Banner image upload failed", err);
      return { ok: false, error: MESSAGES.uploadFailed };
    }

    try {
      const row = await deps.db.create({
        ...fields.value,
        imageUrl: stored.url,
        imagePublicId: stored.publicId,
        sortOrder: await nextSortOrder(fields.value.kind),
        isActive: publish,
      });
      return { ok: true, id: row.id };
    } catch (err) {
      log("Banner could not be saved after upload", err);
      await removeAssetQuietly(stored.publicId, "saving the banner failed"); // do not leave an orphan
      return { ok: false, error: MESSAGES.saveFailed };
    }
  }

  /**
   * Edit text/link/type and, optionally, replace the image.
   * Order of operations for a replacement: validate -> upload new -> save row -> only then delete old.
   */
  async function update(
    id: string,
    rawFields: Record<string, unknown> | null,
    file: Blob | null
  ): Promise<ServiceResult> {
    if (!(await guard())) return { ok: false, error: MESSAGES.unauthorized };

    let existing: BannerRow | null;
    try {
      existing = await deps.db.get(id);
    } catch (err) {
      log("Banner lookup failed", err);
      return { ok: false, error: MESSAGES.saveFailed };
    }
    if (!existing) return { ok: false, error: MESSAGES.notFound };

    let fields: BannerFields | null = null;
    if (rawFields) {
      const parsed = parseBannerFields(rawFields);
      if (!parsed.ok) return parsed;
      fields = parsed.value;
    }

    const hasFile = !!file && file.size > 0;
    if (hasFile) {
      const check = await checkImageFile(file as Blob);
      if (!check.ok) return check;
    }

    let stored: StoredImage | null = null;
    if (hasFile) {
      try {
        stored = await deps.storage.upload(file as Blob);
      } catch (err) {
        log("Banner image replacement upload failed", err);
        return { ok: false, error: MESSAGES.uploadFailed }; // old image and row untouched
      }
    }

    const patch: Partial<Omit<BannerRow, "id">> = { ...(fields ?? {}) };
    if (stored) {
      patch.imageUrl = stored.url;
      patch.imagePublicId = stored.publicId;
    }
    try {
      if (fields && fields.kind !== existing.kind) patch.sortOrder = await nextSortOrder(fields.kind);
      await deps.db.update(id, patch);
    } catch (err) {
      log("Banner update failed", err);
      if (stored) await removeAssetQuietly(stored.publicId, "update failed, discarding the new upload");
      return { ok: false, error: MESSAGES.saveFailed }; // old image still referenced and still in Cloudinary
    }

    if (stored) await removeAssetQuietly(existing.imagePublicId, "old image after successful replacement");
    return { ok: true };
  }

  /** Replace only the image of a banner. */
  function replaceImage(id: string, file: Blob | null): Promise<ServiceResult> {
    if (!file || file.size === 0) {
      return guard().then((allowed) => ({ ok: false as const, error: allowed ? MESSAGES.needImage : MESSAGES.unauthorized }));
    }
    return update(id, null, file);
  }

  /** Publish (true) or unpublish (false). */
  async function setActive(id: string, isActive: boolean): Promise<ServiceResult> {
    if (!(await guard())) return { ok: false, error: MESSAGES.unauthorized };
    try {
      if (!(await deps.db.get(id))) return { ok: false, error: MESSAGES.notFound };
      await deps.db.update(id, { isActive });
      return { ok: true };
    } catch (err) {
      log("Banner publish toggle failed", err);
      return { ok: false, error: MESSAGES.saveFailed };
    }
  }

  /** Remove the banner, then (best effort) its image. */
  async function remove(id: string): Promise<ServiceResult> {
    if (!(await guard())) return { ok: false, error: MESSAGES.unauthorized };
    let existing: BannerRow | null;
    try {
      existing = await deps.db.get(id);
      if (!existing) return { ok: false, error: MESSAGES.notFound };
      await deps.db.remove(id);
    } catch (err) {
      log("Banner removal failed", err);
      return { ok: false, error: MESSAGES.saveFailed };
    }
    await removeAssetQuietly(existing.imagePublicId, "banner removed");
    return { ok: true };
  }

  /** Move a banner one place up or down among banners of the same type. */
  async function move(id: string, direction: "up" | "down"): Promise<ServiceResult> {
    if (!(await guard())) return { ok: false, error: MESSAGES.unauthorized };
    try {
      const rows = await deps.db.list();
      const row = rows.find((r) => r.id === id);
      if (!row) return { ok: false, error: MESSAGES.notFound };
      const ids = sortBanners(rows.filter((r) => r.kind === row.kind)).map((r) => r.id);
      const next = planMove(ids, id, direction);
      if (!next) return { ok: true }; // already at the edge: nothing to do
      await deps.db.setOrder(next);
      return { ok: true };
    } catch (err) {
      log("Banner reorder failed", err);
      return { ok: false, error: MESSAGES.saveFailed };
    }
  }

  return { create, update, replaceImage, setActive, remove, move };
}

export type BannerService = ReturnType<typeof createBannerService>;
