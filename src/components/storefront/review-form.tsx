"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { submitReview, type FeedbackResult } from "@/lib/actions/reviews";
import { ImagePicker } from "@/components/ui/image-picker";

const initial: FeedbackResult = { ok: true };

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Posting…" : children}
    </button>
  );
}

function StarInput() {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <input type="hidden" name="rating" value={value} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= shown ? "text-amber-500" : "text-ink/25"}
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
              <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState(submitReview.bind(null, productId), initial);

  useEffect(() => {
    if (state.ok && state.message) router.refresh();
  }, [state, router]);

  if (state.ok && state.message) {
    return <p className="text-sm text-accent">{state.message}</p>;
  }

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <span className="text-sm text-ink/70">Your rating</span>
        <StarInput />
      </div>

      <label className="block">
        <span className="text-sm text-ink/70">Title (optional)</span>
        <input
          name="title"
          maxLength={120}
          className="mt-1 w-full border border-ink/20 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="text-sm text-ink/70">Your review</span>
        <textarea
          name="body"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          className="mt-1 w-full border border-ink/20 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <ImagePicker
        name="images"
        max={4}
        label="Add photos (optional)"
        hint="Up to 4 photos. Click Add again to pick more."
      />

      {!state.ok && <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}

      <Submit>Post review</Submit>
    </form>
  );
}
