import Image from "next/image";
import { SITE } from "@/lib/site";
import { BRAND } from "@/lib/brand";

export function Brand() {
  if (!BRAND.logo) return <>{SITE.name}</>;

  return (
    <span className="flex items-center gap-3">
      <Image
        src={BRAND.logo}
        alt={SITE.name}
        width={BRAND.width}
        height={BRAND.height}
        priority
        className={`h-32 w-auto ${BRAND.logoDark ? "block dark:hidden" : ""}`}
      />
      {BRAND.logoDark && (
        <Image
          src={BRAND.logoDark}
          alt={SITE.name}
          width={BRAND.width}
          height={BRAND.height}
          priority
          className="hidden h-32 w-auto dark:block"
        />
      )}
      {BRAND.showName && <span>{SITE.name}</span>}
    </span>
  );
}
