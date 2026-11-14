import Link from "next/link";
import { itemRange, pageHref, pageWindow } from "@/lib/pagination";

const base =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-semibold transition";
const idle = `${base} border-ink/20 text-ink hover:border-accent hover:text-accent`;
const current = `${base} border-accent bg-accent text-on-accent`;
const disabled = `${base} cursor-not-allowed border-ink/10 text-ink/50`;

/**
 * Previous / numbered / Next links. Renders nothing for a single page.
 * Plain links (no JavaScript needed), so every page is also crawlable.
 */
export function Pagination({
  basePath,
  params = {},
  page,
  totalPages,
  total,
  pageSize,
}: {
  basePath: string;
  /** Other query parameters to keep on every link, e.g. { q: "buds" }. */
  params?: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}) {
  if (totalPages <= 1) return null;
  const { from, to } = itemRange(page, pageSize, total);

  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-col items-center gap-4">
      <p className="text-sm text-ink/65" aria-live="polite">
        Showing {from}–{to} of {total} {total === 1 ? "product" : "products"} · Page {page} of {totalPages}
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={pageHref(basePath, params, page - 1)} rel="prev" className={idle}>
              <span aria-hidden="true">←&nbsp;</span>Previous
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              <span aria-hidden="true">←&nbsp;</span>Previous
            </span>
          )}
        </li>
        {pageWindow(page, totalPages).map((entry, i) =>
          entry === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="hidden px-1 text-ink/65 sm:block">
              …
            </li>
          ) : (
            <li key={entry} className={entry === page ? undefined : "hidden sm:block"}>
              {entry === page ? (
                <span aria-current="page" aria-label={`Page ${entry}, current page`} className={current}>
                  {entry}
                </span>
              ) : (
                <Link href={pageHref(basePath, params, entry)} aria-label={`Page ${entry}`} className={idle}>
                  {entry}
                </Link>
              )}
            </li>
          )
        )}
        <li>
          {page < totalPages ? (
            <Link href={pageHref(basePath, params, page + 1)} rel="next" className={idle}>
              Next<span aria-hidden="true">&nbsp;→</span>
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              Next<span aria-hidden="true">&nbsp;→</span>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
