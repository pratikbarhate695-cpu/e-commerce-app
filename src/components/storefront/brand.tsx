import Image from "next/image";
import { SITE } from "@/lib/site";
import { BRAND } from "@/lib/brand";

/**
 * Brand lockup: the existing logo artwork (file untouched) on a light pill,
 * plus live "Zero Integration" text.
 *
 * - The pill background and text colours are fixed (NOT theme variables), so the
 *   red/bronze artwork has the same strong contrast in light and dark mode.
 * - The artwork's embedded wordmark is only ~6% of the image height, which is
 *   illegible at header size. So only the monogram is shown (a CSS crop of the
 *   same file, no pixels edited) and the name is real, selectable, readable text.
 * - Crop numbers were measured from public/brand/logo.png (1536x1024): the
 *   monogram box is x 323-1274, y 64-796. If you replace the logo file, re-measure.
 */
const CROP = { w: 952, h: 733, x: 323, y: 64, imgW: 1536, imgH: 1024 };

export function Brand() {
  if (!BRAND.logo) return <>{SITE.name}</>;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FBFAF7] py-1 pl-2 pr-3.5 text-[#1B1B18] shadow-sm ring-1 ring-black/15 min-[360px]:gap-2 sm:py-1.5 sm:pl-2.5 sm:pr-4">
      <span
        aria-hidden="true"
        className="relative block h-7 shrink-0 overflow-hidden min-[360px]:h-8 sm:h-9"
        style={{ aspectRatio: `${CROP.w} / ${CROP.h}` }}
      >
        <Image
          src={BRAND.logo}
          alt=""
          width={CROP.imgW}
          height={CROP.imgH}
          priority
          sizes="96px"
          className="absolute max-w-none"
          style={{
            width: `${(CROP.imgW / CROP.w) * 100}%`,
            height: "auto",
            left: `${(-CROP.x / CROP.w) * 100}%`,
            top: `${(-CROP.y / CROP.h) * 100}%`,
          }}
        />
      </span>
      <span className="whitespace-nowrap text-[13px] font-bold leading-none tracking-tight min-[360px]:text-sm sm:text-base">
        {SITE.name}
      </span>
    </span>
  );
}
