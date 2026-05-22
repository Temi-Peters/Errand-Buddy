import { X } from 'lucide-react';

export default function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/50 p-3 sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div className="w-full rounded-2xl bg-surface p-5 shadow-lift sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-hi text-ink transition hover:bg-stone-200 dark:hover:bg-zinc-700"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
