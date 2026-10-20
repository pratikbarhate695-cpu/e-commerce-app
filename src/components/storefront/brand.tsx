import Image from "next/image";
import { SITE } from "@/lib/site";
import { BRAND } from "@/lib/brand";

// Small on phones, bigger on larger screens. "max-w-none shrink-0" stops the
// browser from squeezing the logo when the menu is crowded.
const SIZE = "h-10 w-auto max-w-none shrink-0 sm:h-14 md:h-[120px]";

export function Brand() {
  if (!BRAND.logo) return <>{SITE.name}</>;

  return (
    <span className="flex shrink-0 items-center gap-3">
      <Image
        src={BRAND.logo}
        alt={SITE.name}
        width={BRAND.width}
        height={BRAND.height}
        priority
        className={`${SIZE} ${BRAND.logoDark ? "block dark:hidden" : ""}`}
      />
      {BRAND.logoDark && (
        <Image
          src={BRAND.logoDark}
          alt={SITE.name}
          width={BRAND.width}
          height={BRAND.height}
          priority
          className={`${SIZE} hidden dark:block`}
        />
      )}
      {BRAND.showName && <span>{SITE.name}</span>}
    </span>
  );
}
