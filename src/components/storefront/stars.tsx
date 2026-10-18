const STAR =
  "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";

function Row({ className }: { className: string }) {
  return (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

/** Read-only stars, supports decimals (4.3 fills 4.3 stars). */
export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span className="relative inline-flex" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <span className="text-ink/20">
        <Row className={className} />
      </span>
      <span className="absolute left-0 top-0 overflow-hidden text-amber-500" style={{ width: `${pct}%` }}>
        <Row className={className} />
      </span>
    </span>
  );
}
