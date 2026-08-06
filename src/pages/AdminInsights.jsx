import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import { COLORS, MultiBarChart } from '../components/Charts';

// Below this many activated customers, percentages are noise rather than signal.
// A "50% repeat rate" from two customers is one person booking twice, and reading
// it as a result is how a pilot talks itself into a conclusion it didn't earn.
const SMALL_SAMPLE = 10;

const pct = (value) => (value == null ? '—' : `${value}%`);
const num = (value) => (value == null ? '—' : String(value));
const money = (value) => (value == null ? '—' : `£${Number(value).toFixed(2)}`);
const mins = (value) => {
  if (value == null) return '—';
  if (value < 60) return `${Math.round(value)} min`;
  const hours = value / 60;
  return hours < 24 ? `${hours.toFixed(1)} hrs` : `${(hours / 24).toFixed(1)} days`;
};

function Stat({ label, value, hint, tone = 'default' }) {
  const toneClass = tone === 'warn'
    ? 'text-amber-600 dark:text-amber-400'
    : tone === 'bad'
      ? 'text-red-600 dark:text-red-400'
      : 'text-ink';
  return (
    <Card>
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-black ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </Card>
  );
}

function Section({ title, blurb, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        {blurb ? <p className="mt-1 text-sm text-muted">{blurb}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function AdminInsights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError('');
    api.adminInsights()
      .then(setData)
      .catch((err) => setError(err.message || 'Could not load insights'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Card className="text-center"><p className="font-bold text-muted">Working out the numbers…</p></Card>;
  if (error) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-bold text-red-600 dark:text-red-400">{error}</p>
        <Button onClick={load}>Try again</Button>
      </Card>
    );
  }
  if (!data) return null;

  const { customers, bookings, fulfilment, economics, runners, weekly, coverage } = data;
  const smallSample = customers.activated < SMALL_SAMPLE;

  const statusRows = Object.entries(bookings.byStatus || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-ink">Is this working?</h1>
          <p className="mt-1 text-muted">
            The numbers that say whether ErrandBuddy is viable — not just how busy it's been.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin"><Button variant="outline">Back to admin</Button></Link>
          <Button onClick={load}>Refresh</Button>
        </div>
      </div>

      {smallSample && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            Too few customers to read the percentages yet
          </p>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            {customers.activated} {customers.activated === 1 ? 'person has' : 'people have'} paid for an errand.
            Below about {SMALL_SAMPLE}, a rate moves by tens of points when one person books again — treat everything
            here as anecdote until the counts grow. The raw counts are still meaningful; the percentages are not.
          </p>
        </Card>
      )}

      {/* ── The headline question ─────────────────────────────────────────── */}
      <Section
        title="The one number that matters"
        blurb="Whether people come back is what separates a service from a favour. Everything else can look healthy while this stays at zero."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Repeat rate"
            value={pct(customers.repeatRate)}
            hint={`${customers.repeatCustomers} of ${customers.activated} paying customers booked more than once`}
            tone={customers.repeatRate != null && customers.repeatRate < 20 && !smallSample ? 'warn' : 'default'}
          />
          <Stat
            label="Median wait before booking again"
            value={customers.medianDaysToSecondBooking == null ? '—' : `${customers.medianDaysToSecondBooking} days`}
            hint="Shorter is better — it means the errand solved a recurring need"
          />
          <Stat
            label="Errands per paying customer"
            value={num(customers.medianBookingsPerActivatedCustomer)}
            hint="Median. A high average with a low median means one person is carrying the numbers"
          />
        </div>
      </Section>

      {/* ── Getting people to a first booking ─────────────────────────────── */}
      <Section
        title="Signing up and getting through checkout"
        blurb="Where people fall out before they have ever used the service."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Registered customers" value={num(customers.registered)} />
          <Stat
            label="Ever paid for an errand"
            value={num(customers.activated)}
            hint={`${pct(customers.activationRate)} of everyone who signed up`}
          />
          <Stat
            label="Checkout completion"
            value={pct(bookings.checkoutCompletionRate)}
            hint="Bookings that got paid for, out of all started"
          />
          <Stat
            label="Started but never paid"
            value={num(bookings.abandonedUnpaid)}
            hint="Still sitting on Pending payment"
            tone={bookings.abandonedUnpaid > 0 ? 'warn' : 'default'}
          />
        </div>
      </Section>

      {/* ── Delivering the errand ─────────────────────────────────────────── */}
      <Section
        title="Actually getting errands done"
        blurb={coverage.note}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Picked up by a runner"
            value={pct(fulfilment.assignmentRate)}
            hint={`${fulfilment.everAssigned} of ${bookings.paid} paid bookings`}
          />
          <Stat label="Completed" value={pct(fulfilment.completionRate)} />
          <Stat
            label="Median wait for a runner"
            value={mins(fulfilment.medianMinutesToAssign)}
            hint="From payment to a runner accepting"
          />
          <Stat
            label="Median time on the errand"
            value={mins(fulfilment.medianMinutesToComplete)}
            hint="From starting to marking complete"
          />
        </div>
        {fulfilment.cancelledAfterAssignment > 0 && (
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            {fulfilment.cancelledAfterAssignment} booking{fulfilment.cancelledAfterAssignment === 1 ? ' was' : 's were'} cancelled
            after a runner had already been assigned — worth understanding why.
          </p>
        )}
        {coverage.bookingsWithLifecycleStamps < coverage.totalBookings && (
          <p className="text-sm text-muted">
            Timing covers {coverage.bookingsWithLifecycleStamps} of {coverage.totalBookings} bookings — the rest predate
            timing being recorded and are excluded rather than counted as instant.
          </p>
        )}
      </Section>

      {/* ── Money ─────────────────────────────────────────────────────────── */}
      <Section
        title="What it costs to run"
        blurb="Promotional pricing is a real cost, not a discount on paper. This shows what the platform actually kept."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Charged to customers" value={money(economics.grossCharged)} />
          <Stat label="Paid to runners" value={money(economics.runnerPayouts)} />
          <Stat
            label="Given away in offers"
            value={money(economics.promotionalSubsidy)}
            tone={economics.promotionalSubsidy > 0 ? 'warn' : 'default'}
            hint="First-errand pricing"
          />
          <Stat
            label="Platform net"
            value={money(economics.platformNet)}
            tone={economics.platformNet < 0 ? 'bad' : 'default'}
            hint={economics.platformNet < 0 ? 'Negative — each errand costs the platform money' : 'After runner payouts'}
          />
        </div>
        <p className="text-sm text-muted">Average charged per errand: {money(economics.averageOrderValue)}</p>
      </Section>

      {/* ── Runners ───────────────────────────────────────────────────────── */}
      <Section title="Runner supply" blurb="A marketplace needs both sides. Approved runners who never take a job are not supply.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Approved and active" value={num(runners.active)} hint={`${runners.total} total applications`} />
          <Stat
            label="Have completed at least one"
            value={num(runners.whoCompletedAtLeastOne)}
            tone={runners.active > 0 && runners.whoCompletedAtLeastOne === 0 ? 'warn' : 'default'}
          />
          <Stat label="Median errands per runner" value={num(runners.medianCompletedTasks)} />
        </div>
      </Section>

      {/* ── Over time ─────────────────────────────────────────────────────── */}
      <Section title="Week by week" blurb="New customers against bookings. Sustained growth needs the two to move together.">
        <Card>
          <MultiBarChart
            data={weekly}
            xKey="week"
            allowDecimals={false}
            // Fixed hue order, never cycled — a series keeps its colour even if
            // another is removed. Validated for colour-blind separation against
            // the chart surface (worst adjacent pair ΔE 8.9 protan).
            bars={[
              { key: 'newCustomers', label: 'New customers', color: COLORS[0] },
              { key: 'bookings', label: 'Bookings', color: COLORS[1] },
              { key: 'completed', label: 'Completed', color: COLORS[2] }
            ]}
            title="By week beginning"
          />
        </Card>

        {/* The chart colours sit below 3:1 against the surface, so the same data is
            available as text. Also just easier to read exact numbers from. */}
        <Card className="overflow-x-auto">
          <p className="mb-3 text-sm font-bold text-muted">The same figures, as numbers</p>
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="p-2">Week beginning</th>
                <th>New customers</th>
                <th>Bookings</th>
                <th>Completed</th>
                <th>Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {weekly.length ? weekly.map((row) => (
                <tr key={row.week} className="border-t border-surface-hi">
                  <td className="p-2 font-semibold text-ink">{row.week}</td>
                  <td>{row.newCustomers}</td>
                  <td>{row.bookings}</td>
                  <td>{row.completed}</td>
                  <td>{row.cancelled}</td>
                </tr>
              )) : (
                <tr><td className="p-2 text-muted" colSpan={5}>No activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </Section>

      {/* ── Booking outcomes ──────────────────────────────────────────────── */}
      <Section title="Where bookings end up">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead><tr className="text-muted"><th className="p-2">Status</th><th>Count</th><th>Share</th></tr></thead>
            <tbody>
              {statusRows.length ? statusRows.map(([status, count]) => (
                <tr key={status} className="border-t border-surface-hi">
                  <td className="p-2 font-semibold text-ink">{status.toLowerCase().replace(/_/g, ' ')}</td>
                  <td>{count}</td>
                  <td>{bookings.total ? `${Math.round((count / bookings.total) * 100)}%` : '—'}</td>
                </tr>
              )) : (
                <tr><td className="p-2 text-muted" colSpan={3}>No bookings yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </Section>

      <p className="text-sm text-muted">
        Generated {new Date(data.generatedAt).toLocaleString('en-GB')} · derived entirely from existing records, with no
        tracking or third-party analytics.
      </p>
    </div>
  );
}
