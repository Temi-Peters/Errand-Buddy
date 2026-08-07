import { Check } from 'lucide-react';

// The customer's view of how far along their errand is.
//
// This is NOT a moving dot, on purpose. A web app stops receiving location the
// moment the phone locks, so a "live" map would freeze mid-journey and look
// broken — worse than showing nothing. Explicit check-ins are honest about what
// is known and when it was last confirmed.
export const STAGES = [
  { key: 'ON_THE_WAY_TO_SHOP', label: 'On the way to the shop' },
  { key: 'AT_SHOP', label: 'At the shop' },
  { key: 'HEADING_TO_YOU', label: 'On the way to you' },
  { key: 'ARRIVED', label: 'Arrived' }
];

const sinceLabel = (iso) => {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? 'about an hour ago' : `about ${hrs} hours ago`;
};

export default function JourneyProgress({ booking, compact = false }) {
  const current = booking.journeyStage || 'NOT_STARTED';
  if (current === 'NOT_STARTED') return null;

  const currentIndex = STAGES.findIndex((s) => s.key === current);
  const updated = sinceLabel(booking.journeyUpdatedAt);

  return (
    <div className={compact ? '' : 'rounded-xl bg-surface-hi p-4'}>
      <ol className="space-y-2">
        {STAGES.map((stage, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={stage.key} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done ? 'bg-secondary text-white'
                    : active ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-surface text-muted'
                }`}
              >
                {done ? <Check size={13} /> : index + 1}
              </span>
              <span className={`text-sm ${active ? 'font-bold text-ink' : done ? 'text-muted' : 'text-muted/70'}`}>
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      {updated && (
        <p className="mt-3 text-sm text-muted">
          Last updated {updated}.
          {booking.lastLocation ? ' Your runner shared their location.' : ''}
        </p>
      )}
    </div>
  );
}
