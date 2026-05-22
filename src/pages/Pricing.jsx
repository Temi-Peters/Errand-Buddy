import { CheckCircle2 } from 'lucide-react';
import Card from '../components/Card';

const plans = [
  ['One-off errands', 'from £15', 'Flexible support when you need a single task completed.'],
  ['1 task/week', 'from £25/week', 'Light weekly help for essentials and repeat errands.'],
  ['2 tasks/week', 'from £45/week', 'Useful for households with regular weekly needs.'],
  ['3 tasks/week', 'from £60/week', 'More frequent support with better weekly value.']
];

export default function Pricing() {
  return (
    <div className="space-y-8">
      <section>
        <span className="page-kicker">Pricing</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">Clear starting prices</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Simple pricing for Leicester errands, with final quotes based on task complexity, distance, and time required.</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map(([plan, price, copy], index) => (
          <Card key={plan} className={`p-6 ${index === 1 ? 'border-primary/30 ring-1 ring-primary/20' : ''}`}>
            <p className="font-extrabold text-ink">{plan}</p>
            <p className="mt-4 text-3xl font-extrabold text-primary">{price}</p>
            <p className="mt-3 min-h-20 leading-7 text-muted">{copy}</p>
            <div className="mt-5 space-y-2 text-sm font-semibold text-muted">
              <p className="flex gap-2"><CheckCircle2 className="text-secondary" size={18} /> Local runner matching</p>
              <p className="flex gap-2"><CheckCircle2 className="text-secondary" size={18} /> Messaging and status updates</p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="border-surface-hi">
        <p className="font-bold text-ink">Final quote note</p>
        <p className="mt-2 text-muted">Final quote may vary depending on task complexity, travel distance, and time required. Payments are currently handled in test mode while the MVP is validated.</p>
      </Card>
    </div>
  );
}
