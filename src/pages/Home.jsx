import { ArrowRight, Pill, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';

const services = [
  { name: 'Grocery Shopping',    Icon: ShoppingCart, href: '/book' },
  { name: 'Prescription Pickup', Icon: Pill,         href: '/book' },
];

export default function Home() {
  return (
    <div className="space-y-16 sm:space-y-24">

      {/* Hero */}
      <section className="pt-10 text-center sm:pt-20">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Local help,<br />when you need it.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted sm:text-lg">
          Book a trusted local runner for groceries and prescriptions — wherever you are.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button as={Link} to="/book" className="w-full px-10 py-3 text-base sm:w-auto">
            Book an errand
          </Button>
          <Button as={Link} to="/become-a-runner" variant="outline" className="w-full px-10 py-3 text-base sm:w-auto">
            Become a runner
          </Button>
        </div>
      </section>

      {/* Services — icon + name only, no descriptions */}
      <section>
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-3 sm:gap-4">
          {services.map(({ name, Icon, href }) => (
            <Link
              key={name}
              to={href}
              className="hover-glow group flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-soft dark:border-zinc-800 dark:bg-surface"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-hi text-muted transition group-hover:bg-stone-900 group-hover:text-white dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900">
                <Icon size={20} />
              </span>
              <p className="text-sm font-semibold text-ink">{name}</p>
            </Link>
          ))}
        </div>
        <div className="mt-5 text-center">
          <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink">
            See all services <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-2xl bg-stone-900 px-8 py-12 text-center text-white dark:bg-zinc-900">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to hand it off?</h2>
        <p className="mx-auto mt-3 max-w-sm text-stone-400">
          Takes two minutes to book. A runner handles the rest.
        </p>
        <Button as={Link} to="/book" variant="white" className="mt-6 px-10 py-3 text-base">
          Book now
        </Button>
      </section>

    </div>
  );
}
