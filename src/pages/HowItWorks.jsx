import { Link } from 'react-router-dom';
import Button from '../components/Button';

const customerSteps = [
  { emoji: '📋', title: 'Book in 2 minutes', body: 'Choose your service, pick a date and time, and describe what you need.' },
  { emoji: '🤝', title: 'We match a runner', body: 'A vetted local runner accepts your task and you get notified straight away.' },
  { emoji: '📦', title: 'It gets done', body: 'Your runner completes the errand and marks it done. Track every step in real time.' },
  { emoji: '⭐', title: 'Rate the service', body: 'Leave a quick rating after completion to keep quality high.' },
];

const runnerSteps = [
  { emoji: '✍️', title: 'Apply online', body: 'Fill in a short application. Takes about 5 minutes.' },
  { emoji: '✅', title: 'Get approved', body: 'We review your application and let you know. Usually within 24 hours.' },
  { emoji: '📍', title: 'Accept local tasks', body: 'Browse available jobs in your area and accept the ones that suit you.' },
  { emoji: '💰', title: 'Get paid', body: 'Earn 90% of the booking value for every completed task.' },
];

const trust = [
  { emoji: '🔍', label: 'Approval checks on every runner' },
  { emoji: '💬', label: 'Direct in-app messaging' },
  { emoji: '📲', label: 'Live status updates' },
  { emoji: '⭐', label: 'Reviewed after every job' },
];

export default function HowItWorks() {
  return (
    <div className="space-y-16">

      {/* Header */}
      <section className="text-center">
        <span className="page-kicker">How it works</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Simple from start to finish</h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-muted">
          Book in minutes. A local runner handles the rest.
        </p>
      </section>

      {/* Customer flow */}
      <section>
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-muted">For customers</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {customerSteps.map(({ emoji, title, body }, i) => (
            <div key={title} className="hover-glow relative flex flex-col items-center rounded-2xl border border-surface-hi bg-surface p-6 text-center shadow-soft">
              <span className="text-5xl leading-none">{emoji}</span>
              <span className="absolute right-4 top-4 text-xs font-black text-muted/40">{i + 1}</span>
              <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button as={Link} to="/book" className="px-10">Book an errand</Button>
        </div>
      </section>

      {/* Runner flow */}
      <section>
        <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-muted">For runners</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {runnerSteps.map(({ emoji, title, body }, i) => (
            <div key={title} className="hover-glow relative flex flex-col items-center rounded-2xl border border-surface-hi bg-surface p-6 text-center shadow-soft">
              <span className="text-5xl leading-none">{emoji}</span>
              <span className="absolute right-4 top-4 text-xs font-black text-muted/40">{i + 1}</span>
              <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button as={Link} to="/become-a-runner" variant="outline" className="px-10">Become a runner</Button>
        </div>
      </section>

      {/* Trust signals */}
      <section>
        <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-muted">What keeps it reliable</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {trust.map(({ emoji, label }) => (
            <div key={label} className="flex flex-col items-center gap-3 rounded-2xl border border-surface-hi bg-surface p-5 text-center shadow-soft">
              <span className="text-3xl">{emoji}</span>
              <p className="text-sm font-semibold text-ink">{label}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
