import { ArrowRight, CalendarCheck, PackageCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { useApp } from '../context/AppContext';

const steps = [
  {
    Icon: CalendarCheck,
    title: 'Book your errand',
    body: 'Choose a service, pick a date and time, and describe exactly what you need. Takes about two minutes.',
  },
  {
    Icon: UserCheck,
    title: 'We match you with a runner',
    body: 'A vetted local runner accepts your task and you get a notification. You can message them directly through the platform.',
  },
  {
    Icon: PackageCheck,
    title: 'It gets done',
    body: 'Your runner completes the errand and marks it done. Rate the service and we handle the rest.',
  },
];

export default function Welcome() {
  const { authUser } = useApp();
  const firstName = authUser?.name?.split(' ')[0] || 'there';

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-8 text-center">

      {/* Greeting */}
      <section>
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lift dark:bg-zinc-100 dark:text-zinc-900">
          <PackageCheck size={28} />
        </span>
        <h1 className="mt-5 text-4xl font-black tracking-tight text-ink">
          Welcome, {firstName}.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg leading-7 text-muted">
          Your ErrandBuddy account is ready. Here's how it works.
        </p>
      </section>

      {/* Steps */}
      <section className="space-y-4 text-left">
        {steps.map(({ Icon, title, body }, index) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-surface"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Step {index + 1}</p>
              <h2 className="mt-0.5 text-base font-bold text-ink">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* CTAs */}
      <section className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button as={Link} to="/book" className="w-full px-10 py-3 text-base sm:w-auto">
          Book your first errand <ArrowRight size={16} />
        </Button>
        <Button as={Link} to="/customer/dashboard" variant="ghost" className="w-full text-base sm:w-auto">
          Go to my dashboard
        </Button>
      </section>

    </div>
  );
}
