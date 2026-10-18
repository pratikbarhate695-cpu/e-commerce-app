import { formatDateTime } from "@/lib/format";
import type { TimelineStep } from "@/lib/order-status";

function CheckIcon() { return <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function CrossIcon() { return <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function Marker({ step }: { step: TimelineStep }) {
  const base = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full";
  if (step.state === "done") return <span className={`${base} bg-accent text-paper`}><CheckIcon /></span>;
  if (step.state === "current") return <span className={`${base} border-2 border-accent`}><span className="h-2.5 w-2.5 rounded-full bg-accent motion-safe:animate-pulse" /></span>;
  if (step.state === "problem") return <span className={`${base} border border-red-400/60 text-red-300`}><CrossIcon /></span>;
  return <span className={`${base} border border-ink/25`} />;
}

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return <ol>{steps.map((step, i) => {
    const next = steps[i + 1];
    const isUpcoming = step.state === "upcoming";
    const lineTravelled = next ? next.state !== "upcoming" : false;
    return <li key={step.status} className="flex gap-4" aria-current={step.state === "current" ? "step" : undefined}>
      <div className="flex flex-col items-center"><Marker step={step} />{next && <span className={`my-1 w-px flex-1 ${lineTravelled ? "bg-accent" : "bg-ink/15"}`} />}</div>
      <div className={`min-w-0 flex-1 ${next ? "pb-7" : ""}`}>
        <p className={`text-sm leading-7 ${isUpcoming ? "text-ink/40" : step.state === "current" ? "font-medium text-ink" : "text-ink"}`}>{step.label}</p>
        {step.at && <time dateTime={step.at.toISOString()} className="block text-xs text-ink/50">{formatDateTime(step.at)}</time>}
        <p className={`mt-1 text-sm ${isUpcoming ? "text-ink/35" : "text-ink/60"}`}>{step.description}</p>
        {step.note && <p className="mt-2 border-l-2 border-ink/15 pl-3 text-sm text-ink/80">{step.note}</p>}
      </div>
    </li>;
  })}</ol>;
}
