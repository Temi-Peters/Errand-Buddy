import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

const plans = [
  {
    name: 'One-off',
    price: 'from £15',
    per: 'per task',
    copy: 'Flexible help whenever you need a single task completed.',
    highlight: false,
  },
  {
    name: '1 task/week',
    price: '£28',
    per: 'per week',
    copy: 'Light weekly help for essentials and repeat errands.',
    highlight: true,
  },
  {
    name: '2 tasks/week',
    price: '£50',
    per: 'per week',
    copy: 'Useful for households with regular weekly needs.',
    highlight: false,
  },
  {
    name: '3 tasks/week',
    price: '£66',
    per: 'per week',
    copy: 'More frequent support with better weekly value.',
    highlight: false,
  },
];

const features = ['Vetted local runner', 'Real-time status updates', 'In-app messaging', 'Rate your runner'];

export default function Pricing() {
  return (
    <div className="space-y-10">

      {/* Header — centred */}
      <section className="text-center">
        <span className="page-kicker">Pricing</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">Clear starting prices</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg leading-8 text-muted">
          Simple pricing for Leicester errands. Final quotes based on task complexity, distance, and time required.
        </p>
      </section>

      {/* Plans */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map(({ name, price, per, copy, highlight }) => (
          <Card
            key={name}
            className={`flex flex-col p-6 text-center ${highlight ? 'border-stone-900 ring-1 ring-stone-900 dark:border-zinc-400 dark:ring-zinc-400' : ''}`}
          >
            {highlight && (
              <span className="mb-3 inline-block rounded-full bg-stone-900 px-3 py-0.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                Most popular
              </span>
            )}
            <p className="text-sm font-bold uppercase tracking-widest text-muted">{name}</p>
            <p className="mt-3 text-4xl font-black text-ink">{price}</p>
            <p className="text-sm text-muted">{per}</p>
            <p className="mt-4 flex-1 leading-7 text-muted">{copy}</p>
            <ul className="mt-5 space-y-2 text-left text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-muted">
                  <CheckCircle2 size={16} className="flex-shrink-0 text-secondary" />
                  {f}
                </li>
              ))}
            </ul>
            <Button as={Link} to="/book" variant={highlight ? 'primary' : 'outline'} className="mt-6 w-full">
              Book now
            </Button>
          </Card>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-sm text-muted">
        Final price may vary based on task complexity and travel distance. Payments are in test mode during the MVP phase.
      </p>

    </div>
  );
}
