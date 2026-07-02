import { useId } from 'react';

/**
 * Errand Buddy logo mark — "Express Buddy".
 * A friendly parcel zipping off to run an errand.
 *
 * Renders in `currentColor`, so it inherits the surrounding text color
 * (e.g. `text-white` inside the dark squircle, `text-ink` on a light bg).
 * The face is knocked out (transparent) so it shows whatever sits behind it.
 *
 * Usage:
 *   <BuddyMark className="h-[18px] w-[18px]" />
 */
export default function BuddyMark({ className = '' }) {
  const id = useId();              // unique per instance — avoids mask-id collisions
  const mask = `ebface-${id}`;
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="54" cy="41" r="3.6" fill="#000" />
        <circle cx="69" cy="41" r="3.6" fill="#000" />
        <path d="M55 51 Q61.5 58 68 51" fill="none" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
      </mask>
      <g transform="rotate(-12 61 46)">
        <rect x="42" y="27" width="38" height="38" rx="8" mask={`url(#${mask})`} />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
        <path d="M10 37 L27 37" />
        <path d="M8 50 L21 50" opacity="0.5" />
        <path d="M13 62 L24 62" opacity="0.28" />
      </g>
    </svg>
  );
}
