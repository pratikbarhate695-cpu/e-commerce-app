/**
 * Page-number handling shared by Shop, category and search (pure, unit-tested).
 *  - Invalid page values (missing, 0, negative, fractional, "abc", "1e3") mean page 1.
 *  - Pages beyond the last are clamped to the last page.
 *  - Links keep every other query parameter (e.g. the search term `q`).
 */

export const DEFAULT_PAGE_SIZE = 24;

const MAX_PARSED_PAGE = 1_000_000_000;

export function parsePageParam(raw: string | string[] | null | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return 1;
  const text = value.trim();
  if (!/^\d{1,12}$/.test(text)) return 1;
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n < 1) return 1;
  return Math.min(n, MAX_PARSED_PAGE);
}

/** At least 1, even when there are no products (the empty page is page 1 of 1). */
export function totalPagesFor(total: number, pageSize: number): number {
  const size = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE;
  const count = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  return Math.max(1, Math.ceil(count / size));
}

export function clampPage(page: number, totalPages: number): number {
  const last = Math.max(1, Math.floor(totalPages) || 1);
  const wanted = Number.isFinite(page) ? Math.floor(page) : 1;
  return Math.min(Math.max(1, wanted), last);
}

/** "Showing from–to of total": 1-based, inclusive; 0/0 when empty. */
export function itemRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(page * pageSize, total) };
}

/** Link to `page` of `basePath`, keeping other params; page 1 has no `page` param. */
export function pageHref(
  basePath: string,
  params: Readonly<Record<string, string | undefined>>,
  page: number
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && value !== undefined && value !== "") search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Page buttons to render: always first, last, and current ±1; "gap" marks skipped runs. */
export function pageWindow(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const wanted = new Set([1, totalPages, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}
