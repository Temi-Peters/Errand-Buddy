import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ label = 'Verified', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary ${className}`}>
      <BadgeCheck size={13} />
      {label}
    </span>
  );
}
