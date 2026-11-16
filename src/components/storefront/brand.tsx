
import Image from "next/image";
import { BRAND } from "@/lib/brand";

export function Brand() {
  if (!BRAND.logo) return null;

  return (
    <span className="relative inline-flex h-14 w-[300px] shrink-0 items-center sm:h-14 sm:w-[480px]">
      <Image
        src={BRAND.logo}
        alt="Maquatom"
        fill
        priority
        sizes="(max-width: 640px) 300px, 480px"
        className="object-contain object-left"
      />
    </span>
  );
}
