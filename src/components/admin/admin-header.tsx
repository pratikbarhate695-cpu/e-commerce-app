import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AdminHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-5 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {action}
      </div>
    </div>
  );
}
