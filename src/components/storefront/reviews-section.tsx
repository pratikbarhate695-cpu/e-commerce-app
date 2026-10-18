import Link from "next/link";
import Image from "next/image";
import { Stars } from "@/components/storefront/stars";
import { ReviewForm } from "@/components/storefront/review-form";
import { QuestionForm } from "@/components/storefront/question-form";
import { publicName } from "@/lib/reviews";
import type { getProductFeedback } from "@/lib/reviews";

type Feedback = Awaited<ReturnType<typeof getProductFeedback>>;

function dateLabel(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function ReviewsSection({
  productId,
  slug,
  feedback,
  signedIn,
  hasReviewed,
}: {
  productId: string;
  slug: string;
  feedback: Feedback;
  signedIn: boolean;
  hasReviewed: boolean;
}) {
  const loginHref = `/login?from=${encodeURIComponent(`/product/${slug}`)}`;

  return (
    <section id="reviews" className="mx-auto max-w-4xl px-6 pb-20">
      <h2 className="border-t border-ink/10 pt-10 font-serif text-2xl">Customer reviews</h2>

      <div className="mt-4 flex items-center gap-3">
        {feedback.count > 0 ? (
          <>
            <span className="text-3xl font-medium">{feedback.average.toFixed(1)}</span>
            <Stars value={feedback.average} className="h-5 w-5" />
            <span className="text-sm text-ink/60">
              {feedback.count} review{feedback.count > 1 ? "s" : ""}
            </span>
          </>
        ) : (
          <p className="text-sm text-ink/60">No reviews yet. Be the first to review this product.</p>
        )}
      </div>

      <div className="mt-8">
        {!signedIn ? (
          <p className="text-sm">
            <Link href={loginHref} className="underline underline-offset-4">
              Sign in
            </Link>{" "}
            to write a review.
          </p>
        ) : hasReviewed ? (
          <p className="text-sm text-ink/60">You have already reviewed this product. Thank you!</p>
        ) : (
          <details className="group">
            <summary className="inline-block cursor-pointer border border-ink px-5 py-2 text-sm font-medium hover:bg-ink hover:text-paper">
              Write a review
            </summary>
            <div className="mt-6">
              <ReviewForm productId={productId} />
            </div>
          </details>
        )}
      </div>

      <ul className="mt-10 space-y-8">
        {feedback.reviews.map((r) => (
          <li key={r.id} className="border-b border-ink/10 pb-8">
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={r.rating} />
              {r.title && <span className="font-medium">{r.title}</span>}
            </div>
            <p className="mt-1 text-xs text-ink/50">
              {publicName(r.user.name)} · {dateLabel(r.createdAt)}
              {r.isVerified && <span className="ml-2 text-accent">✓ Verified purchase</span>}
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/80">{r.body}</p>
            {r.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.images.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={img.url}
                      alt="Customer photo"
                      width={96}
                      height={96}
                      className="h-24 w-24 border border-ink/10 object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-14 border-t border-ink/10 pt-10 font-serif text-2xl">Questions &amp; answers</h2>

      <div className="mt-6">
        {signedIn ? (
          <QuestionForm productId={productId} />
        ) : (
          <p className="text-sm">
            <Link href={loginHref} className="underline underline-offset-4">
              Sign in
            </Link>{" "}
            to ask a question.
          </p>
        )}
      </div>

      {feedback.questions.length === 0 ? (
        <p className="mt-8 text-sm text-ink/60">No questions yet.</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {feedback.questions.map((q) => (
            <li key={q.id} className="text-sm">
              <p>
                <span className="font-medium">Q:</span> {q.question}
              </p>
              <p className="mt-0.5 text-xs text-ink/50">
                {publicName(q.user.name)} · {dateLabel(q.createdAt)}
              </p>
              {q.answer ? (
                <p className="mt-2 border-l-2 border-accent pl-3 text-ink/80">
                  <span className="font-medium">Seller answer:</span> {q.answer}
                </p>
              ) : (
                <p className="mt-2 pl-3 text-ink/50">Waiting for an answer.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
