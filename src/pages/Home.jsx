import { ArrowRight, ListChecks, MessageSquare, PawPrint, Pill, ShieldCheck, Shirt, ShoppingCart, Star, Users, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

const services = [
  { name: 'Dog Walking',         Icon: PawPrint,     desc: 'Regular walks from trusted local runners.' },
  { name: 'Grocery Shopping',    Icon: ShoppingCart, desc: 'Weekly shop handled with your exact list.' },
  { name: 'Prescription Pickup', Icon: Pill,         desc: 'Medication collected and delivered safely.' },
  { name: 'Dry Cleaning',        Icon: Shirt,        desc: 'Drop-off and collection made effortless.' },
  { name: 'General Errands',     Icon: ListChecks,   desc: 'Anything local — we handle the legwork.' },
];

const stats = [
  ['90%',  'Runner payout'],
  ['5+',   'Leicester areas'],
  ['£15',  'Starting price'],
  ['24h',  'Avg. booking time'],
];

export default function Home() {
  return (
    <div className="space-y-20 sm:space-y-28">

      {/* Hero — clean type, no box */}
      <section className="pb-8 pt-8 text-center sm:pb-12 sm:pt-16">
        <span className="page-kicker">Leicester Local Errand Marketplace</span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-6xl lg:text-7xl">
          Everyday errands,<br className="hidden sm:block" /> handled locally.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-muted sm:text-lg">
          Reliable local runners for grocery runs, prescription pickups, dog walks, and more across Leicester.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button as={Link} to="/book" className="w-full px-8 py-3 text-base sm:w-auto">
            Book an errand <ArrowRight size={18} />
          </Button>
          <Button as={Link} to="/become-a-runner" variant="outline" className="w-full px-8 py-3 text-base sm:w-auto">
            Become a runner
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-muted">
          <p className="flex items-center gap-2"><ShieldCheck size={14} /> Vetted runners only</p>
          <p className="flex items-center gap-2"><MessageSquare size={14} /> In-app messaging</p>
          <p className="flex items-center gap-2"><Star size={14} /> Rated every task</p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map(([value, label]) => (
          <Card key={label} className="py-7 text-center">
            <p className="text-3xl font-bold text-ink">{value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
          </Card>
        ))}
      </section>

      {/* Services */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="page-kicker">Everyday help</span>
            <h2 className="section-title mt-3">Popular local services</h2>
          </div>
          <Button as={Link} to="/services" variant="outline">View all services <ArrowRight size={15} /></Button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {services.map(({ name, Icon, desc }) => (
            <Card key={name} className="group cursor-pointer p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hi text-muted">
                <Icon size={18} />
              </span>
              <h3 className="mt-4 font-semibold text-ink">{name}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <div className="mb-8 text-center">
          <span className="page-kicker">Simple process</span>
          <h2 className="section-title mt-3">Three steps, done</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ['Choose your errand', 'Tell us what needs doing, where, and when. Takes under two minutes.'],
            ['Get matched locally', 'An approved Leicester runner accepts your task or gets assigned by the team.'],
            ['Track, message, rate', 'Stay updated, message your runner directly, and review when done.'],
          ].map(([title, copy], index) => (
            <Card key={title} className="relative overflow-hidden p-7">
              <span className="absolute right-5 top-4 select-none text-7xl font-bold text-surface-hi">{index + 1}</span>
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {index + 1}
              </span>
              <h3 className="relative mt-5 text-lg font-bold text-ink">{title}</h3>
              <p className="relative mt-2 leading-7 text-muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA duo */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-stone-900 p-8 text-white dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Transparent pricing</p>
          <h2 className="mt-2 text-3xl font-bold">Errands from £15</h2>
          <p className="mt-3 leading-7 text-stone-400">One-off help or a weekly plan. Clear quotes before you confirm anything.</p>
          <Button as={Link} to="/pricing" variant="white" className="mt-6">See pricing</Button>
        </div>
        <Card className="p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Built around trust</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Safety first</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[['Runner checks', ShieldCheck], ['Local coverage', Users], ['Fair payouts', WalletCards]].map(([label, Icon]) => (
              <div key={label} className="rounded-xl bg-surface-hi p-4">
                <Icon className="text-muted" size={18} />
                <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

    </div>
  );
}
