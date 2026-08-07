import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ label = 'Verified', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary ${className}`}>
      <BadgeCheck size={13} />
      {label}
    </span>
  );
}

// A runner with too few reviews shows "New" rather than a number. Inventing one
// either flatters (5) or punishes (2.5) — and a low fabricated score suppresses
// the very bookings that would earn real reviews.
export const MIN_REVIEWS_FOR_RATING = 3;

export function RunnerRating({ runner, className = '' }) {
  const count = runner?.reviewCount;
  const rating = Number(runner?.rating || 0);

  if (count == null || count < MIN_REVIEWS_FOR_RATING || rating <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-lg bg-surface-hi px-2 py-0.5 text-xs font-bold text-muted ${className}`}>
        New runner
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-bold text-ink ${className}`}>
      ★ {rating.toFixed(1)}
      <span className="font-normal text-muted">({count})</span>
    </span>
  );
}
