export function AdminHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink/10 px-8 py-6">
      <h1 className="text-xl font-medium">{title}</h1>
      {action}
    </div>
  );
}
