import {
  ArrowRight,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  MapPin,
  PackageCheck,
  PoundSterling,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';

const customerSteps = [
  {
    Icon: CalendarCheck,
    title: 'Book in 2 minutes',
    body: 'Choose a service, pick a date and time, and describe what you need.',
  },
  {
    Icon: UserCheck,
    title: 'We match a runner',
    body: 'A vetted local runner accepts your task. You get notified straight away.',
  },
  {
    Icon: PackageCheck,
    title: 'It gets done',
    body: 'Your runner completes the errand and marks it done. Track every step live.',
  },
  {
    Icon: Star,
    title: 'Rate the service',
    body: 'Leave a quick rating after completion to keep quality high.',
  },
];

const runnerSteps = [
  {
    Icon: ClipboardList,
    title: 'Apply online',
    body: 'Fill in a short application. Takes about 5 minutes.',
  },
  {
    Icon: ShieldCheck,
    title: 'Get approved',
    body: 'We review your application and get back to you, usually within 24 hours.',
  },
  {
    Icon: MapPin,
    title: 'Accept local tasks',
    body: 'Browse jobs in your area and pick up the ones that suit your schedule.',
  },
  {
    Icon: PoundSterling,
    title: 'Get paid',
    body: 'Earn 90% of the booking value for every task you complete.',
  },
];

export default function HowItWorks() {
  const [view, setView] = useState('customer');
  const steps = view === 'customer' ? customerSteps : runnerSteps;

  return (
    <div className="space-y-12">

      {/* Header */}
      <section className="text-center">
        <span className="page-kicker">How it works</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Simple from start to finish
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-8 text-muted">
          Book in minutes. A local runner handles the rest.
        </p>
      </section>

      {/* Toggle */}
      <div className="flex justify-center">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-surface-hi bg-surface-hi p-1.5">
          {['customer', 'runner'].map((role) => (
            <button
              key={role}
              onClick={() => setView(role)}
              className={`min-h-11 rounded-lg px-8 text-sm font-bold capitalize transition-all duration-200 ease-out ${
                view === role
                  ? 'bg-stone-900 text-white shadow-soft dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {role === 'customer' ? 'I need help' : 'I want to earn'}
            </button>
          ))}
        </div>
      </div>

      {/* Flow */}
      <section>
        {/* Desktop — horizontal with arrows */}
        <div className="hidden items-start gap-0 lg:flex">
          {steps.map(({ Icon, title, body }, i) => (
            <div key={title} className="flex flex-1 items-start">
              <div className="hover-glow flex flex-1 flex-col items-center rounded-2xl border border-surface-hi bg-surface p-6 text-center shadow-soft">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-soft dark:bg-zinc-100 dark:text-zinc-900">
                  <Icon size={24} />
                </span>
                <p className="mt-1 text-xs font-bold text-muted/50">0{i + 1}</p>
                <h3 className="mt-2 text-base font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex shrink-0 items-center px-2 pt-7">
                  <ArrowRight size={20} className="text-muted/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile — vertical with down arrows */}
        <div className="flex flex-col gap-0 lg:hidden">
          {steps.map(({ Icon, title, body }, i) => (
            <div key={title} className="flex flex-col items-center">
              <div className="hover-glow flex w-full flex-col items-center rounded-2xl border border-surface-hi bg-surface p-6 text-center shadow-soft">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-soft dark:bg-zinc-100 dark:text-zinc-900">
                  <Icon size={24} />
                </span>
                <p className="mt-1 text-xs font-bold text-muted/50">0{i + 1}</p>
                <h3 className="mt-2 text-base font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </div>
              {i < steps.length - 1 && (
                <ChevronDown size={22} className="my-1 text-muted/40" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        {view === 'customer' ? (
          <Button as={Link} to="/book" className="px-12 py-3 text-base">
            Book an errand
          </Button>
        ) : (
          <Button as={Link} to="/register" state={{ role: 'runner' }} className="px-12 py-3 text-base">
            Apply as a runner
          </Button>
        )}
      </div>

    </div>
  );
}
