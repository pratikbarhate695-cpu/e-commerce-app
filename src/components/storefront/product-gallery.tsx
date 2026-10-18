"use client";

import { useState } from "react";
import Image from "next/image";

type Img = { id: string; url: string; altText: string | null };

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!current) {
    return (
      <div className="aspect-square w-full bg-ink/[0.04] flex items-center justify-center text-sm text-ink/40">
        No image
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square w-full overflow-hidden bg-ink/[0.04]">
        <Image
          key={current.id}
          src={current.url}
          alt={current.altText ?? name}
          width={800}
          height={800}
          priority
          className="h-full w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden border bg-ink/[0.04] ${
                i === active ? "border-ink" : "border-ink/20 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText ?? name}
                width={96}
                height={96}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
