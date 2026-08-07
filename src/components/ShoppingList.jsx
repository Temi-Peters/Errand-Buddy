import { Plus, Trash2 } from 'lucide-react';
import Button from './Button';

// The customer's editable shopping list. Structured rather than free text so a
// runner can mark each line off, and so a backup can be named in advance —
// "if no Hovis, get Warburtons" saves a phone call from the aisle.
export default function ShoppingList({ items, onChange }) {
  const update = (index, field, value) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };
  const add = () => onChange([...items, { name: '', quantity: '', backupName: '' }]);
  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-muted">Your shopping list</p>
        <p className="mt-0.5 text-sm text-muted">
          One line per item. Adding a backup means your runner won't need to ring you if the first choice is gone.
        </p>
      </div>

      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-surface-hi p-3">
          <div className="flex gap-2">
            <input
              className="focus-ring min-h-11 flex-1 rounded-lg border border-surface-hi px-3"
              placeholder="e.g. Hovis wholemeal loaf"
              value={item.name}
              onChange={(e) => update(index, 'name', e.target.value)}
            />
            <input
              className="focus-ring min-h-11 w-20 rounded-lg border border-surface-hi px-3"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => update(index, 'quantity', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove ${item.name || 'item'}`}
              className="flex min-h-11 w-11 items-center justify-center rounded-lg border border-surface-hi text-muted hover:text-ink"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm"
            placeholder="If they haven't got it, get… (optional)"
            value={item.backupName || ''}
            onChange={(e) => update(index, 'backupName', e.target.value)}
          />
        </div>
      ))}

      <Button type="button" variant="outline" onClick={add}>
        <Plus size={16} /> Add an item
      </Button>
    </div>
  );
}
