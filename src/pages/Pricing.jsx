import { MessageSquare, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

const plans = [
  {
    name: 'One-off',
    price: 'from £25',
    per: 'per task',
    copy: 'Pay as you go. No commitment, no subscription.',
    perks: ['No weekly commitment', 'Book same-day or in advance', 'Cancel up to 24hrs before'],
    highlight: false,
  },
  {
    name: '1 task/week',
    price: '£20',
    per: 'per week',
    copy: 'Regular help at a better rate.',
    perks: ['Save £5 vs one-off', 'Consistent weekly runner', 'Cancel anytime'],
    highlight: true,
  },
  {
    name: '2 tasks/week',
    price: '£38',
    per: 'per week',
    copy: 'For households that need reliable weekly support.',
    perks: ['Priority runner matching', 'Mix and match services', 'Save £12 per week vs one-off'],
    highlight: false,
  },
  {
    name: '3 tasks/week',
    price: '£54',
    per: 'per week',
    copy: 'Maximum support, best value per task.',
    perks: ['Best rate per task', 'Flexible scheduling', 'Save £21 per week vs one-off'],
    highlight: false,
  },
];

const included = [
  { Icon: ShieldCheck, label: 'Vetted local runner' },
  { Icon: MessageSquare, label: 'In-app messaging' },
  { Icon: MapPin, label: 'Real-time status updates' },
  { Icon: Star, label: 'Rating after every job' },
];

export default function Pricing() {
  return (
    <div className="space-y-10">

      <section className="text-center">
        <span className="page-kicker">Pricing</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">Clear starting prices</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg leading-8 text-muted">
          Simple pricing for local errands. Final quotes based on task complexity, distance, and time required.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map(({ name, price, per, copy, perks, highlight }) => (
          <Card
            key={name}
            className={`hover-glow flex flex-col p-6 text-center ${highlight ? 'border-stone-900 ring-1 ring-stone-900 dark:border-zinc-400 dark:ring-zinc-400' : ''}`}
          >
            {highlight && (
              <span className="mb-3 inline-block rounded-full bg-stone-900 px-3 py-0.5 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                Most popular
              </span>
            )}
            <p className="text-sm font-bold uppercase tracking-widest text-muted">{name}</p>
            <p className="mt-3 text-4xl font-black text-ink">{price}</p>
            <p className="text-sm text-muted">{per}</p>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted">{copy}</p>
            <ul className="mt-5 space-y-2 text-left text-sm">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-muted">
                  <span className="mt-0.5 text-xs">→</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <Button as={Link} to="/book" variant={highlight ? 'primary' : 'outline'} className="mt-6 w-full">
              Book now
            </Button>
          </Card>
        ))}
      </div>

      {/* What's always included */}
      <div>
        <p className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-muted">Every booking includes</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {included.map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-3 rounded-2xl border border-surface-hi bg-surface p-4 text-center shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                <Icon size={18} />
              </span>
              <p className="text-sm font-semibold text-ink">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-muted">
        Final price may vary based on task complexity and travel distance. Payments are in test mode during the MVP phase.
      </p>

    </div>
  );
}
