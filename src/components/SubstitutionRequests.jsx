import { useState } from 'react';
import Button from './Button';
import Card from './Card';

// The customer's side of an in-shop substitution. The runner is standing in the
// aisle waiting, so this is deliberately two big buttons and a photo — no typing,
// nothing to read carefully, and usable with shaky hands or poor eyesight.
export default function SubstitutionRequests({ items, onDecide, bookingLabel }) {
  const [busyId, setBusyId] = useState(null);
  const waiting = items.filter((item) => item.status === 'AWAITING_APPROVAL');
  if (!waiting.length) return null;

  const decide = async (itemId, approved) => {
    setBusyId(itemId);
    try {
      await onDecide(itemId, approved);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-lg font-black text-amber-900 dark:text-amber-200">
        Your runner needs an answer
      </p>
      {bookingLabel ? <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-200/80">{bookingLabel}</p> : null}

      <div className="mt-4 space-y-4">
        {waiting.map((item) => (
          <div key={item.id} className="rounded-xl bg-surface p-4">
            <p className="text-base font-bold text-ink">
              They haven't got {item.name}
            </p>
            <p className="mt-1 text-base text-muted">
              Instead they suggest <span className="font-bold text-ink">{item.proposedSubstitute}</span>
            </p>

            {item.substitutePhoto && (
              <img
                src={item.substitutePhoto}
                alt={`Photo of ${item.proposedSubstitute}`}
                className="mt-3 max-h-56 w-full rounded-lg border border-surface-hi object-contain"
              />
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                className="w-full text-base"
                loading={busyId === item.id}
                onClick={() => decide(item.id, true)}
              >
                Yes, that's fine
              </Button>
              <Button
                variant="outline"
                className="w-full text-base"
                loading={busyId === item.id}
                onClick={() => decide(item.id, false)}
              >
                No, leave it
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
