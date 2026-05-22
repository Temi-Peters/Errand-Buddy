import { Bike, CheckCircle2, MapPin, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

export default function BecomeRunner() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-[#1C1830] to-primary p-8 text-white shadow-lift sm:p-10">
        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/90">Runner applications</span>
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Earn by helping people around Leicester</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">Complete local errands, keep 90% of task fees, and work in areas you know well.</p>
        <Button as={Link} to="/register" state={{ role: 'runner' }} className="mt-7 bg-white text-primary hover:bg-violet-50">Apply as Runner</Button>
      </section>
      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <WalletCards className="text-secondary" />
          <h2 className="mt-4 text-xl font-extrabold text-ink">Keep 90%</h2>
          <p className="mt-2 text-muted">Fair payouts are built into the marketplace model.</p>
        </Card>
        <Card>
          <MapPin className="text-primary" />
          <h2 className="mt-4 text-xl font-extrabold text-ink">Local areas</h2>
          <p className="mt-2 text-muted">Oadby, Stoneygate, Knighton, Clarendon Park, Evington and nearby.</p>
        </Card>
        <Card>
          <Bike className="text-secondary" />
          <h2 className="mt-4 text-xl font-extrabold text-ink">Flexible travel</h2>
          <p className="mt-2 text-muted">Car, bike, public transport or walking routes can all work.</p>
        </Card>
      </div>
      <Card className="p-6">
        <h2 className="text-2xl font-extrabold text-ink">Requirements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {['18+', 'Reliable and responsive', 'Based near Leicester', 'Able to travel locally', 'Must pass approval checks'].map((item) => (
            <p key={item} className="flex items-center gap-2 rounded-xl bg-surface-hi p-4 font-bold text-ink">
              <CheckCircle2 className="text-secondary" /> {item}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
