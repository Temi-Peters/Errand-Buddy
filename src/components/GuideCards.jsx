import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import { GUIDE_VERSION } from '../data/guides';

const seenKey = (role) => `errandBuddy.guideSeen.${role}`;

export const hasSeenGuide = (role) => {
  try {
    return Number(localStorage.getItem(seenKey(role)) || 0) >= GUIDE_VERSION;
  } catch {
    // Private browsing or blocked storage — don't nag, and don't crash.
    return true;
  }
};

const markSeen = (role) => {
  try {
    localStorage.setItem(seenKey(role), String(GUIDE_VERSION));
  } catch {
    /* nothing we can do, and nothing worth breaking over */
  }
};

// A short walkthrough shown once per person, reopenable from the Help button.
// One card at a time rather than a wall of text: the audience skews older and
// less app-confident, so this is big type, one idea per screen, and always
// skippable — never a gate in front of the thing they came to do.
export function GuideModal({ guide, role, onClose }) {
  const [index, setIndex] = useState(0);
  const card = guide.cards[index];
  const last = index === guide.cards.length - 1;

  const finish = () => {
    markSeen(role);
    onClose();
  };

  return (
    <Modal title={guide.title} onClose={finish}>
      <div className="space-y-5">
        <p className="text-sm text-muted">{guide.intro}</p>

        <div className="rounded-xl bg-surface-hi p-5 text-center">
          <div className="text-4xl" aria-hidden="true">{card.emoji}</div>
          <h3 className="mt-3 text-xl font-black text-ink">{card.title}</h3>
          <p className="mt-2 text-base leading-relaxed text-muted">{card.body}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5" role="presentation">
          {guide.cards.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-ink' : 'w-2 bg-surface-hi'}`}
            />
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {index > 0 ? (
            <Button variant="outline" className="w-full" onClick={() => setIndex(index - 1)}>Back</Button>
          ) : (
            <Button variant="ghost" className="w-full" onClick={finish}>Skip</Button>
          )}
          <Button className="w-full" onClick={() => (last ? finish() : setIndex(index + 1))}>
            {last ? 'Got it' : 'Next'}
          </Button>
        </div>

        <p className="text-center text-sm text-muted">
          Step {index + 1} of {guide.cards.length} · you can reopen this any time from Help
        </p>
      </div>
    </Modal>
  );
}

// The persistent way back in, so dismissing the tour never loses it.
export function HelpButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-hi px-3 text-sm font-semibold text-muted transition hover:text-ink ${className}`}
    >
      <HelpCircle size={16} /> Help
    </button>
  );
}

// Small nudge for people who skipped the tour, so it isn't gone for good.
export function GuideBanner({ onOpen, onDismiss, label }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-hi bg-surface p-3">
      <p className="text-sm text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="text-sm" onClick={onOpen}>Show me</Button>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="p-2 text-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
