import { CheckCircle2 } from 'lucide-react';
import Card from '../components/Card';

const customer = ['Choose an errand', 'Pick a date/time', 'Get matched with a local runner', 'Track progress and message your runner', 'Rate the service'];
const runner = ['Apply', 'Get approved', 'Accept local tasks', 'Complete errands', 'Get paid'];

const Flow = ({ title, items }) => (
  <Card className="p-6">
    <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
    <div className="mt-6 space-y-4">
      {items.map((item, index) => (
        <div key={item} className="flex gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-hi font-extrabold text-muted">{index + 1}</span>
          <div>
            <p className="font-bold text-ink">{item}</p>
            <p className="text-sm text-muted">Clear, accountable and easy to follow.</p>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default function HowItWorks() {
  return (
    <div className="space-y-8">
      <section>
        <span className="page-kicker">How it works</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">A calmer way to get errands done</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Errand Buddy connects customers with approved local runners, with simple booking, messaging and completion tracking.</p>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <Flow title="For customers" items={customer} />
        <Flow title="For runners" items={runner} />
      </div>
      <Card className="bg-surface-hi p-6">
        <h2 className="text-2xl font-extrabold text-ink">What keeps it reliable?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {['Runner approval checks', 'Status updates', 'Reviews after completion'].map((item) => (
            <p key={item} className="flex items-center gap-2 rounded-xl bg-surface p-4 font-bold text-ink">
              <CheckCircle2 className="text-secondary" /> {item}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
