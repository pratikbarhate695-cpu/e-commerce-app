/**
 * Homepage banner rules: validation, selection and ordering.
 *
 * Dependency-free on purpose (no framework, alias, database or network imports)
 * so every rule can be unit-tested in isolation and shared by the admin screens,
 * the server actions and the homepage.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Below the 5 MB server-action limit in next.config.js, leaving room for the text fields. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const BANNER_KINDS = ["HERO", "PROMO"] as const;
export type BannerKind = (typeof BANNER_KINDS)[number];

export const LIMITS = { title: 80, subtitle: 200, buttonText: 30, linkUrl: 300, altText: 160 } as const;

export type BannerRow = {
  id: string;
  imageUrl: string;
  imagePublicId: string | null;
  linkUrl: string | null;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  altText: string | null;
  kind: BannerKind;
  sortOrder: number;
  isActive: boolean;
};

export type BannerFields = {
  kind: BannerKind;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  altText: string | null;
};

/* ------------------------------------------------------------------ images */

export type ImageCheck = { ok: true; type: string } | { ok: false; error: string };

/** Identifies the real format from the first bytes, ignoring the (spoofable) file name and MIME type. */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

/** Cheap checks that need no file contents (used in the browser too). */
export function checkImageMeta(file: { type: string; size: number }): ImageCheck {
  if (!file || file.size === 0) return { ok: false, error: "Choose an image file." };
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG or WebP images are allowed." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `The image is too large. The limit is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.` };
  }
  return { ok: true, type: file.type };
}

/** Server-side check: declared type, size AND real file signature must all agree. */
export async function checkImageFile(file: {
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}): Promise<ImageCheck> {
  const meta = checkImageMeta(file);
  if (!meta.ok) return meta;
  const head = new Uint8Array(await file.arrayBuffer()).subarray(0, 16);
  const real = sniffImageType(head);
  if (!real || real !== file.type) {
   return {
    ok: false,
    error: "That file is not a valid JPG, PNG or WebP image.",
   };
  }
  return { ok: true, type: real };
}

/* ------------------------------------------------------------------ fields */

/** Only site-relative paths ("/shop") or https URLs. Blocks javascript:, data:, protocol-relative "//". */
export function isSafeLink(url: string): boolean {
  if (/[\s\u0000-\u001f]/.test(url)) return false;
  if (url.startsWith("/")) return !url.startsWith("//") && !url.includes("\\");
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.length > 0;
  } catch {
    return false;
  }
}

function text(value: unknown, max: number, label: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length > max) return { ok: false, error: `${label} must be ${max} characters or fewer.` };
  return { ok: true, value: s === "" ? null : s };
}

export function parseBannerFields(
  raw: Record<string, unknown>
): { ok: true; value: BannerFields } | { ok: false; error: string } {
  const kindRaw = typeof raw.kind === "string" && raw.kind !== "" ? raw.kind : "HERO";
  if (!(BANNER_KINDS as readonly string[]).includes(kindRaw)) return { ok: false, error: "Choose a valid banner type." };

  const title = text(raw.title, LIMITS.title, "Heading");
  if (!title.ok) return title;
  const subtitle = text(raw.subtitle, LIMITS.subtitle, "Subtitle");
  if (!subtitle.ok) return subtitle;
  const buttonText = text(raw.buttonText, LIMITS.buttonText, "Button text");
  if (!buttonText.ok) return buttonText;
  const altText = text(raw.altText, LIMITS.altText, "Image description");
  if (!altText.ok) return altText;
  const linkUrl = text(raw.linkUrl, LIMITS.linkUrl, "Button link");
  if (!linkUrl.ok) return linkUrl;
  if (linkUrl.value && !isSafeLink(linkUrl.value)) {
    return { ok: false, error: "The button link must start with / (for example /shop) or https://." };
  }
  if (buttonText.value && !linkUrl.value) {
    return { ok: false, error: "Add a button link, or clear the button text." };
  }

  return {
    ok: true,
    value: {
      kind: kindRaw as BannerKind,
      title: title.value,
      subtitle: subtitle.value,
      buttonText: buttonText.value,
      linkUrl: linkUrl.value,
      altText: altText.value,
    },
  };
}

/* --------------------------------------------------------- selection/order */

export function sortBanners<T extends { sortOrder: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** What visitors see in the hero: published HERO banners, in the admin's order. Drafts never appear. */
export function selectHeroBanners<T extends { kind: string; isActive: boolean; sortOrder: number; id: string }>(rows: T[]): T[] {
  return sortBanners(rows.filter((r) => r.isActive && r.kind === "HERO"));
}

/** Published promotion tiles shown below the hero. Anything that is not HERO (including old rows) stays here. */
export function selectPromoBanners<T extends { kind: string; isActive: boolean; sortOrder: number; id: string }>(rows: T[]): T[] {
  return sortBanners(rows.filter((r) => r.isActive && r.kind !== "HERO"));
}

/**
 * New order of ids after moving one banner up or down inside its own list.
 * Returns null when the move is impossible (already first/last, or unknown id).
 */
export function planMove(orderedIds: string[], id: string, direction: "up" | "down"): string[] | null {
  const i = orderedIds.indexOf(id);
  if (i === -1) return null;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= orderedIds.length) return null;
  const next = [...orderedIds];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** What the visitor's browser will see for one slide's button. */
export function slideButton(slide: { linkUrl: string | null; buttonText: string | null }): { href: string; label: string } | null {
  if (!slide.linkUrl) return null;
  return { href: slide.linkUrl, label: slide.buttonText || "Shop now" };
}
