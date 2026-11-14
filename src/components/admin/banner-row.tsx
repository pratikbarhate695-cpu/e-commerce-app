"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/admin/badge";
import { BannerEditor, type EditableBanner } from "@/components/admin/banner-editor";
import { deleteBanner, moveBanner, setBannerActive } from "@/lib/actions/admin/banners";

/** One banner in the list: status, order, publish/unpublish, edit/replace image, remove. */
export function BannerRow({ banner, isFirst, isLast }: { banner: EditableBanner; isFirst: boolean; isLast: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  const link = "text-xs underline underline-offset-4 text-ink/65 hover:text-ink disabled:opacity-40 disabled:no-underline";

  return (
    <div className="border-b border-ink/10 pb-4">
      <div className="flex flex-wrap items-center gap-4">
        <Image src={banner.imageUrl} alt={banner.altText ?? banner.title ?? ""} width={128} height={72} className="h-16 w-28 object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{banner.title || "Untitled"}</p>
          <p className="truncate text-xs text-ink/65">{banner.subtitle || banner.linkUrl || "No text or link"}</p>
        </div>
        <Badge tone={banner.isActive ? "good" : "neutral"}>{banner.isActive ? "Published" : "Draft"}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" disabled={pending || isFirst} onClick={() => run(() => moveBanner(banner.id, "up"))} className={link} aria-label="Move earlier">↑ Move up</button>
        <button type="button" disabled={pending || isLast} onClick={() => run(() => moveBanner(banner.id, "down"))} className={link} aria-label="Move later">↓ Move down</button>
        <button type="button" disabled={pending} onClick={() => run(() => setBannerActive(banner.id, !banner.isActive))} className={link}>
          {banner.isActive ? "Unpublish" : "Publish"}
        </button>
        <button type="button" disabled={pending} onClick={() => setEditing((v) => !v)} className={link}>
          {editing ? "Close editor" : "Edit / replace image"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Remove this banner and its image? This cannot be undone.")) run(() => deleteBanner(banner.id));
          }}
          className="text-xs underline underline-offset-4 text-red-700 hover:opacity-80 disabled:opacity-40 dark:text-red-300"
        >
          Remove
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {editing && (
        <div className="mt-4 border border-ink/10 p-4">
          <BannerEditor banner={banner} onDone={() => { setEditing(false); router.refresh(); }} />
        </div>
      )}
    </div>
  );
}
