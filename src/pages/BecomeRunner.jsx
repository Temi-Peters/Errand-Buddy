import { Bike, CheckCircle2, MapPin, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

export default function BecomeRunner() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-stone-900 p-8 text-white shadow-lift sm:p-10 dark:bg-zinc-900">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Earn by helping people in your area</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-400">Complete local errands, keep 90% of task fees, and work in areas you know well.</p>
        <Button as={Link} to="/register" state={{ role: 'runner' }} variant="white" className="mt-7">Apply as Runner</Button>
      </section>
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="hover-glow">
          <WalletCards className="text-secondary" size={20} />
          <h2 className="mt-4 text-xl font-bold text-ink">Keep 90%</h2>
          <p className="mt-2 text-muted">Fair payouts are built into the marketplace model.</p>
        </Card>
        <Card className="hover-glow">
          <MapPin className="text-muted" size={20} />
          <h2 className="mt-4 text-xl font-bold text-ink">Local areas</h2>
          <p className="mt-2 text-muted">Take on tasks in your local area and the neighbourhoods around you.</p>
        </Card>
        <Card className="hover-glow">
          <Bike className="text-secondary" size={20} />
          <h2 className="mt-4 text-xl font-bold text-ink">Flexible travel</h2>
          <p className="mt-2 text-muted">Car, bike, public transport or walking routes can all work.</p>
        </Card>
      </div>
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-ink">Requirements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {['18+', 'Reliable and responsive', 'Based locally', 'Able to travel in your area', 'Must pass approval checks'].map((item) => (
            <p key={item} className="flex items-center gap-2 rounded-xl bg-surface-hi p-4 font-semibold text-ink">
              <CheckCircle2 className="text-secondary" size={18} /> {item}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
