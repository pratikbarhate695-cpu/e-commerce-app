"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { submitQuestion, type FeedbackResult } from "@/lib/actions/reviews";

const initial: FeedbackResult = { ok: true };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink px-6 py-2.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Sending…" : "Ask question"}
    </button>
  );
}

export function QuestionForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState(submitQuestion.bind(null, productId), initial);

  useEffect(() => {
    if (state.ok && state.message) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="max-w-xl space-y-3">
      <textarea
        key={state.ok && state.message ? "sent" : "new"}
        name="question"
        rows={2}
        required
        maxLength={500}
        placeholder="Ask something about this product"
        className="w-full border border-ink/20 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {state.ok && state.message && <p className="text-sm text-accent">{state.message}</p>}
      {!state.ok && <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      <Submit />
    </form>
  );
}
