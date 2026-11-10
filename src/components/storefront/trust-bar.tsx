import Link from "next/link";
import type { ReactNode } from "react";
import { RETURN_DAYS, WARRANTY_DAYS } from "@/lib/store-info";
import { ReturnIcon, ShieldIcon, SupportIcon, WarrantyIcon } from "@/components/storefront/icons";

/**
 * Trust points shown on the homepage. Every number and phrase comes from the
 * same config as the policy pages (SITE.returnDays / SITE.warrantyDays), so this can
 * never disagree with the refund policy: change src/lib/site.ts and it follows.
 */
export function getTrustItems(): { title: string; text: string; icon: ReactNode; href?: string }[] {
  return [
    { title: "100% authentic", text: "Genuine products", icon: <ShieldIcon className="h-7 w-7" /> },
    {
      title: `${RETURN_DAYS}-day returns`,
      text: "From the date of delivery",
      icon: <ReturnIcon className="h-7 w-7" />,
      href: "/refund-policy",
    },
    {
      title: `${WARRANTY_DAYS}-day warranty`,
      text: "Details in our policy",
      icon: <WarrantyIcon className="h-7 w-7" />,
      href: "/refund-policy",
    },
    {
      title: "Contact us",
      text: "By email or phone",
      icon: <SupportIcon className="h-7 w-7" />,
      href: "/contact",
    },
  ];
}

/** Compact trust row for the responsive hero. */
export function HeroTrustRow() {
  return (
    <ul className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 text-sm text-ink/70">
      {getTrustItems().map((item) => (
        <li key={item.title} className="flex items-center gap-3">
          <span className="text-accent">{item.icon}</span>
          <span>
            <span className="block font-semibold text-ink">{item.title}</span>
            <span className="block text-xs text-ink/65">{item.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Full-width bar on the light page background. */
export function TrustBar() {
  return (
    <section aria-label="Why shop with us" className="border-t border-ink/10 bg-surface">
      <ul className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-9 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-0 lg:px-8">
        {getTrustItems().map((item) => {
          const body = (
            <>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                {item.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{item.title}</span>
                <span className="block text-sm text-ink/65">{item.text}</span>
              </span>
            </>
          );
          return (
            <li key={item.title} className="lg:border-l lg:border-ink/10 lg:px-6 lg:first:border-l-0 lg:first:pl-0">
              {item.href ? (
                <Link href={item.href} className="flex items-center gap-4 rounded-xl transition hover:text-accent">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
