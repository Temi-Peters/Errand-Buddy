import { Dog, Pill, ShoppingBasket, Shirt, ListTodo } from 'lucide-react';
import Card from './Card';

const icons = {
  'Dog Walking': Dog,
  'Grocery Shopping': ShoppingBasket,
  'Prescription Pickup': Pill,
  'Dry Cleaning': Shirt,
  'General Errands': ListTodo
};

export default function ServiceCard({ service, selected, onClick }) {
  const Icon = icons[service] || ListTodo;
  return (
    <button onClick={onClick} className="text-left">
      <Card className={`h-full transition hover:-translate-y-0.5 hover:border-primary ${selected ? 'border-primary ring-2 ring-primary/20' : ''}`}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-hi text-muted">
          <Icon size={24} />
        </div>
        <h3 className="text-lg font-bold text-ink">{service}</h3>
        <p className="mt-2 text-sm text-muted">Matched with a vetted local runner near you.</p>
      </Card>
    </button>
  );
}
