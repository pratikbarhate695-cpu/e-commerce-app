"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Lets people pick images one after another (each pick is ADDED to the list,
 * it does not replace the earlier ones), shows previews, allows removing,
 * and shrinks big photos in the browser before upload.
 * The chosen files are placed in a real <input type="file" name={name}>, so it
 * works inside normal forms and server actions.
 */

const MAX_SIDE = 1600;

async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  if (file.size < 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ImagePicker({
  name,
  max = 8,
  label = "Add images",
  hint,
}: {
  name: string;
  max?: number;
  label?: string;
  hint?: string;
}) {
  const realInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function commit(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (realInput.current) realInput.current.files = dt.files;
    setFiles(next);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // so the same file can be picked again later
    if (picked.length === 0) return;
    setError(null);
    setBusy(true);

    const images = picked.filter((f) => f.type.startsWith("image/"));
    if (images.length < picked.length) setError("Only image files can be added.");

    const room = max - files.length;
    if (images.length > room) setError(`You can add up to ${max} images.`);

    const next = [...files];
    for (const file of images.slice(0, Math.max(room, 0))) {
      const duplicate = next.some((f) => f.name === file.name && f.size === file.size);
      if (duplicate) continue;
      next.push(await shrink(file));
    }
    commit(next);
    setBusy(false);
  }

  return (
    <div>
      <span className="text-sm text-ink/60">{label}</span>

      {/* The real input that is submitted with the form. */}
      <input ref={realInput} type="file" name={name} multiple className="hidden" tabIndex={-1} />

      <div className="mt-2 flex flex-wrap gap-3">
        {files.map((f, i) => (
          <div key={`${f.name}-${f.size}-${i}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previews[i]} alt="" className="h-24 w-20 border border-ink/15 bg-ink/[0.04] object-contain" />
            <button
              type="button"
              onClick={() => commit(files.filter((_, idx) => idx !== i))}
              className="absolute -right-2 -top-2 h-5 w-5 bg-ink text-xs text-paper"
              title="Remove"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}

        {files.length < max && (
          <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-ink/30 text-xs text-ink/60 hover:border-accent hover:text-ink">
            <span className="text-xl leading-none">+</span>
            {busy ? "Wait…" : "Add"}
            <input type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
          </label>
        )}
      </div>

      <p className="mt-2 text-xs text-ink/50">
        {files.length} of {max} added. {hint ?? "You can add images in several steps."}
      </p>
      {error && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
