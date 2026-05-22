import { X } from 'lucide-react';
import Button from './Button';

export default function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/50 p-3 sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div className="w-full rounded-2xl bg-surface p-5 shadow-lift sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <Button variant="ghost" className="min-h-11 w-11 px-0" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
