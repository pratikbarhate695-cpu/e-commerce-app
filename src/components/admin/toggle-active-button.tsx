"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ToggleActiveButton({
  id,
  isActive,
  action,
}: {
  id: string;
  isActive: boolean;
  action: (id: string, isActive: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await action(id, !isActive);
          router.refresh();
        })
      }
      className="text-xs underline underline-offset-4 text-ink/60 hover:text-ink disabled:opacity-50"
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
