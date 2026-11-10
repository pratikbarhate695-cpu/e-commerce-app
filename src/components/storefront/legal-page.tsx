import { SITE } from "@/lib/site";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** "Last updated" text for this page. Falls back to SITE.lastUpdated. */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-serif text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-ink/65">Last updated: {updated ?? SITE.lastUpdated}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-ink/80 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}
