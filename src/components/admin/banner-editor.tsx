"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AdminField, AdminSelect } from "@/components/admin/fields";
import { AdminSubmitButton } from "@/components/admin/submit-button";
import { HERO_FRAME_CLASS, HeroSlide } from "@/components/storefront/hero-banners";
import { checkImageMeta, LIMITS } from "@/lib/banners/rules";
import { createBanner, updateBanner } from "@/lib/actions/admin/banners";
import type { AdminActionResult } from "@/lib/actions/admin/products";

export type EditableBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  altText: string | null;
  kind: "HERO" | "PROMO";
  isActive: boolean;
};

const initial: AdminActionResult = { ok: true };
const MAX_SIDE = 2400;

/** Phone photos are often 5-12 MB. Shrink them in the browser first, like product photos. */
/** Convert supported images to a genuine JPEG and resize large photos. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);

    try {
      const scale = Math.min(
        1,
        MAX_SIDE / Math.max(bitmap.width, bitmap.height)
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.86)
      );

      if (!blob) return file;

      return new File(
        [blob],
        file.name.replace(/\.[^.]+$/, "") + ".jpg",
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        }
      );
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
/**
 * Create or edit one banner, with a live preview that uses the same component as the homepage.
 * Nothing is public until "Publish now" (new) or the banner is published in the list.
 */
export function BannerEditor({
  banner,
  onDone,
}: {
  banner?: EditableBanner;
  onDone?: () => void;
}) {
  const editing = !!banner;

  const [state, formAction] = useActionState(
    editing ? updateBanner : createBanner,
    initial
  );

  const fileInput = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const [kind, setKind] = useState<string>(banner?.kind ?? "HERO");
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [buttonText, setButtonText] = useState(banner?.buttonText ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [altText, setAltText] = useState(banner?.altText ?? "");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview]
  );

  // After a successful create, clear the form; after a successful edit, close it.
  useEffect(() => {
    if (state.ok && "created" in state && state.created) {
      form.current?.reset();

      // Intentional reset of controlled fields after a successful server action.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle("");
      setSubtitle("");
      setButtonText("");
      setLinkUrl("");
      setAltText("");
      setLocalPreview(null);
    }

    if (state.ok && editing && state !== initial) {
      onDone?.();
    }
  }, [state, editing, onDone]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];

    setFileError(null);

    if (!picked) {
      setLocalPreview(null);
      return;
    }

    setBusy(true);

    const ready = await shrink(picked);
    const check = checkImageMeta(ready);

    if (!check.ok) {
      setFileError(check.error);
      e.target.value = "";
      setLocalPreview(null);
      setBusy(false);
      return;
    }

    const dt = new DataTransfer();
    dt.items.add(ready);

    if (fileInput.current) {
      fileInput.current.files = dt.files;
    }

    setLocalPreview(URL.createObjectURL(ready));
    setBusy(false);
  }

  const previewImage = localPreview ?? banner?.imageUrl ?? null;

  return (
    <form ref={form} action={formAction} className="space-y-5">
      {editing && <input type="hidden" name="id" value={banner.id} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-ink/65">
              {editing ? "Replace image (optional)" : "Image"}
            </span>

            <input
              ref={fileInput}
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              required={!editing}
              onChange={onPick}
              className="mt-1 block w-full text-sm"
            />

            <span className="mt-1 block text-xs text-ink/65">
              JPG, PNG or WebP, up to 4 MB (large photos are shrunk automatically).
              Best size: about 1920 × 800 pixels, with the main subject away
              from the left edge where the text sits.
              {editing &&
                " The current image stays live until the new one has uploaded successfully."}
            </span>

            {busy && (
              <span className="mt-1 block text-xs text-ink/65">
                Preparing image…
              </span>
            )}

            {fileError && (
              <span
                role="alert"
                className="mt-1 block text-xs text-red-700 dark:text-red-300"
              >
                {fileError}
              </span>
            )}
          </label>

          <AdminSelect
            label="Where it appears"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="HERO">Homepage hero (top banner)</option>
            <option value="PROMO">Promotion strip (below the hero)</option>
          </AdminSelect>

          <AdminField
            label="Heading (optional)"
            name="title"
            value={title}
            maxLength={LIMITS.title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <AdminField
            label="Subtitle (optional)"
            name="subtitle"
            value={subtitle}
            maxLength={LIMITS.subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <AdminField
              label="Button text"
              name="buttonText"
              placeholder="Shop now"
              value={buttonText}
              maxLength={LIMITS.buttonText}
              onChange={(e) => setButtonText(e.target.value)}
            />

            <AdminField
              label="Button link"
              name="linkUrl"
              placeholder="/shop"
              value={linkUrl}
              maxLength={LIMITS.linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>

          <AdminField
            label="Image description (for screen readers)"
            name="altText"
            value={altText}
            maxLength={LIMITS.altText}
            onChange={(e) => setAltText(e.target.value)}
          />
        </div>

        <div>
          <p className="text-sm text-ink/65">
            Preview{kind === "HERO" ? " (as it will look on the homepage)" : ""}
          </p>

          <div className="mt-1 overflow-hidden border border-ink/15">
            {previewImage ? (
              <div
                className={HERO_FRAME_CLASS.replace(
                  "lg:h-[560px]",
                  "lg:h-[420px]"
                )}
              >
                <HeroSlide
                  slide={{
                    imageUrl: previewImage,
                    title: title || null,
                    subtitle: subtitle || null,
                    buttonText: buttonText || null,
                    linkUrl: linkUrl || null,
                    altText: altText || null,
                  }}
                  unoptimized={!!localPreview}
                  interactive={false}
                />
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center bg-ink/[0.04] text-sm text-ink/65">
                Choose an image to see the preview
              </div>
            )}
          </div>

          <p className="mt-2 text-xs text-ink/65">
            The preview only shows what you have picked. Nothing is uploaded
            or shown to visitors yet.
          </p>
        </div>
      </div>

      {!state.ok && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      {state.ok && state !== initial && !editing && (
        <p role="status" className="text-sm text-green-700 dark:text-green-300">
          Saved.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {editing ? (
          <>
            <AdminSubmitButton pendingLabel="Saving…">
              Save changes
            </AdminSubmitButton>

            <button
              type="button"
              onClick={onDone}
              className="text-sm underline underline-offset-4 text-ink/65 hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <IntentButton intent="draft" label="Save as draft" secondary />
            <IntentButton intent="publish" label="Publish now" />
          </>
        )}
      </div>
    </form>
  );
}

function IntentButton({
  intent,
  label,
  secondary,
}: {
  intent: string;
  label: string;
  secondary?: boolean;
}) {
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      className={
        secondary
          ? "border border-ink/30 px-5 py-2 text-sm font-medium hover:bg-ink/[0.05]"
          : "bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90"
      }
    >
      {label}
    </button>
  );
}
