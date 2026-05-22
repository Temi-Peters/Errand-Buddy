import { ArrowRight, CheckCircle2, Clock, MapPin, MessageSquare, ShieldCheck, ShoppingBag, Star, Users, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

const services = [
  { name: 'Dog Walking',         Icon: Clock,        desc: 'Regular walks from trusted local runners.' },
  { name: 'Grocery Shopping',    Icon: ShoppingBag,  desc: 'Weekly shop handled with your exact list.' },
  { name: 'Prescription Pickup', Icon: ShieldCheck,  desc: 'Medication collected and delivered safely.' },
  { name: 'Dry Cleaning',        Icon: CheckCircle2, desc: 'Drop-off and collection made effortless.' },
  { name: 'General Errands',     Icon: MapPin,       desc: 'Anything local — we handle the legwork.' },
];

const stats = [
  ['90%',  'Runner payout'],
  ['5+',   'Leicester areas'],
  ['£15',  'Starting price'],
  ['24h',  'Avg. booking time'],
];

export default function Home() {
  return (
    <div className="space-y-12 sm:space-y-20">

      {/* Hero — always dark/premium */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-primary to-violet-900 px-5 py-12 text-white shadow-lift sm:rounded-3xl sm:px-12 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(196,181,253,0.20),transparent)]" />
        <div
          className="absolute right-0 top-0 h-full w-1/2 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/90 backdrop-blur">
            Leicester Local Errand Marketplace
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Busy? Let Errand<br />
            <span className="text-white/80">Buddy</span> Handle It
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-violet-200">
            Reliable local runners for everyday errands across Leicester — grocery runs, prescription pickups, dog walks and more.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button as={Link} to="/book" className="w-full px-8 py-3 text-base sm:w-auto">
              Book an errand <ArrowRight size={18} />
            </Button>
            <Button as={Link} to="/become-a-runner" variant="white" className="w-full px-8 py-3 text-base sm:w-auto">
              Become a runner
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-violet-200">
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-white/70" /> Vetted runners only</p>
            <p className="flex items-center gap-2"><MessageSquare size={16} className="text-white/70" /> In-app messaging</p>
            <p className="flex items-center gap-2"><Star size={16} className="text-white/70" /> Rated every task</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <Card key={label} className="py-7 text-center">
            <p className="text-3xl font-extrabold text-ink">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
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
            <Card key={name} className="group cursor-pointer p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lift">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-hi text-muted">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 font-bold text-ink">{name}</h3>
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
              <span className="absolute right-5 top-4 select-none text-7xl font-extrabold text-surface-hi">{index + 1}</span>
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-hi text-sm font-extrabold text-ink">
                {index + 1}
              </span>
              <h3 className="relative mt-5 text-xl font-extrabold text-ink">{title}</h3>
              <p className="relative mt-2 leading-7 text-muted">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA duo */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Always-dark premium card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1C1830] to-[#0C0A14] p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Transparent pricing</p>
          <h2 className="mt-2 text-3xl font-extrabold">Errands from £15</h2>
          <p className="mt-3 leading-7 text-white/60">One-off help or a weekly plan. Clear quotes before you confirm anything.</p>
          <Button as={Link} to="/pricing" className="mt-6 bg-white text-primary hover:bg-violet-50">See pricing</Button>
        </div>
        <Card className="p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Built around trust</p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink">Safety first</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[['Runner checks', ShieldCheck], ['Local coverage', Users], ['Fair payouts', WalletCards]].map(([label, Icon]) => (
              <div key={label} className="rounded-xl bg-surface-hi p-4">
                <Icon className="text-muted" size={20} />
                <p className="mt-3 text-sm font-bold text-ink">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

    </div>
  );
}
