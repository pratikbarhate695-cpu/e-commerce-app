import Link from "next/link";
import { RETURN_DAYS, WARRANTY_DAYS } from "@/lib/store-info";
import { DISPATCH_WORKING_DAYS, TRANSIT_WORKING_DAYS, deliveryRangeLabel } from "@/lib/delivery";
import { WarrantyIcon } from "@/components/storefront/icons";

const icon = "h-6 w-6 shrink-0 text-accent";

function TruckIcon() {
  return (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h11v9H2z" />
      <path d="M13 9h4l3 3v3h-7z" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4v4h4" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function DeliveryInfo() {
  return (
    <div className="mt-6 flex items-start gap-3 border border-ink/10 px-4 py-3 text-sm">
      <TruckIcon />
      <div>
        <p>
          <span className="text-ink/65">Estimated delivery </span>
          <span className="font-medium">{deliveryRangeLabel()}</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-ink/65">
          An estimate, not a guarantee: dispatch in {DISPATCH_WORKING_DAYS.min}–{DISPATCH_WORKING_DAYS.max} working
          days, then {TRANSIT_WORKING_DAYS.min}–{TRANSIT_WORKING_DAYS.max} working days in transit, if you order
          today. Sundays and public holidays are not counted.{" "}
          <Link href="/shipping-policy" className="underline underline-offset-2 hover:text-accent">
            Shipping policy
          </Link>
        </p>
      </div>
    </div>
  );
}

export function TrustBadges() {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <li className="flex items-center gap-3 border border-ink/10 px-4 py-3">
        <ReturnIcon />
        <span>
          <span className="block font-medium">{RETURN_DAYS}-day returns</span>
          <span className="block text-xs text-ink/65">From the date of delivery</span>
        </span>
      </li>
      <li className="flex items-center gap-3 border border-ink/10 px-4 py-3">
        <ShieldIcon />
        <span>
          <span className="block font-medium">100% authentic</span>
          <span className="block text-xs text-ink/65">Genuine product</span>
        </span>
      </li>
      <li className="col-span-2 flex items-center gap-3 border border-ink/10 px-4 py-3">
        <WarrantyIcon className="h-6 w-6 shrink-0 text-accent" />
        <span>
          <span className="block font-medium">{WARRANTY_DAYS}-day warranty</span>
          <span className="block text-xs text-ink/65">Separate from the {RETURN_DAYS}-day return window</span>
        </span>
      </li>
    </ul>
  );
}
