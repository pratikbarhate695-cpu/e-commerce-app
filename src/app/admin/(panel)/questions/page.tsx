import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/require-admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { ConfirmButton } from "@/components/admin/confirm-button";
import {
  answerQuestion,
  deleteQuestion,
  setQuestionHidden,
} from "@/lib/actions/admin/reviews";

const include = {
  product: { select: { name: true, slug: true } },
  user: { select: { name: true, email: true } },
} as const;

type QuestionRow = Awaited<ReturnType<typeof loadUnanswered>>[number];

function loadUnanswered() {
  return prisma.productQuestion.findMany({
    where: { answer: null },
    include,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

function QuestionCard({ q }: { q: QuestionRow }) {
  return (
    <div className={`border border-ink/10 p-4 ${q.isHidden ? "opacity-60" : ""}`}>
      <p className="text-sm">
        <span className="font-medium">Q:</span> {q.question}
      </p>
      <p className="mt-1 text-xs text-ink/50">
        <Link href={`/product/${q.product.slug}`} className="underline">
          {q.product.name}
        </Link>{" "}
        · {q.user.name} ({q.user.email}) · {q.createdAt.toLocaleDateString("en-IN")}
        {q.isHidden && <span className="ml-2 text-red-700 dark:text-red-300">Hidden from the website</span>}
      </p>

      <form action={answerQuestion.bind(null, q.id)} className="mt-3 space-y-2">
        <textarea
          name="answer"
          rows={3}
          maxLength={2000}
          defaultValue={q.answer ?? ""}
          placeholder="Type your answer here"
          className="w-full border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90">
          {q.answer ? "Update answer" : "Save answer"}
        </button>
      </form>

      <div className="mt-3 flex gap-4 text-sm">
        <form action={setQuestionHidden.bind(null, q.id, !q.isHidden)}>
          <button type="submit" className="underline underline-offset-4">
            {q.isHidden ? "Show on website" : "Hide from website"}
          </button>
        </form>
        <form action={deleteQuestion.bind(null, q.id)}>
          <ConfirmButton message="Delete this question permanently?" className="text-red-700 underline underline-offset-4 dark:text-red-300">
            Delete
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}

export default async function AdminQuestionsPage() {
  await requireAdmin();

  const [unanswered, answered] = await Promise.all([
    loadUnanswered(),
    prisma.productQuestion.findMany({
      where: { answer: { not: null } },
      include,
      orderBy: { answeredAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div>
      <AdminHeader title="Questions & answers" />
      <div className="max-w-3xl space-y-10 p-8">
        <section>
          <h2 className="text-sm font-medium">Waiting for an answer ({unanswered.length})</h2>
          <div className="mt-4 space-y-4">
            {unanswered.length === 0 && <p className="text-sm text-ink/60">No new questions.</p>}
            {unanswered.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium">Answered ({answered.length})</h2>
          <div className="mt-4 space-y-4">
            {answered.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
