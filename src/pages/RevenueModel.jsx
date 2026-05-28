import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '../components/Card';

// ─── Stripe cost constants ────────────────────────────────────────────────────
const STRIPE_PCT = 0.015;
const STRIPE_FIXED = 0.20;
const CONNECT_PCT = 0.0025;
const CONNECT_FIXED = 0.25;

function calcNet(fee, commRate) {
  const stripeFee = fee * STRIPE_PCT + STRIPE_FIXED;
  const commission = fee * commRate;
  const runnerPay = fee * (1 - commRate);
  const connectFee = runnerPay * CONNECT_PCT + CONNECT_FIXED;
  return commission - stripeFee - connectFee;
}

function blendedNet(gf, pf, commRate, groceryMix) {
  return groceryMix * calcNet(gf, commRate) + (1 - groceryMix) * calcNet(pf, commRate);
}

const SUB_WEEKLY_FEE = 48;
function subscriptionMargin(bookingCount, subMix, commRate) {
  const subscribers = bookingCount * subMix;
  const grossMonthly = subscribers * SUB_WEEKLY_FEE * 4.33 * commRate;
  const stripeCost = subscribers * SUB_WEEKLY_FEE * 4.33 * STRIPE_PCT + STRIPE_FIXED;
  return grossMonthly - stripeCost;
}

const VOLUMES = {
  conservative: [20, 25, 32, 40, 50, 62],
  base:         [40, 55, 72, 90, 112, 135],
  optimistic:   [80, 110, 145, 185, 230, 280],
};

const MONTHS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
const COMM_RATES = [8, 10, 12.5, 15, 17.5, 20, 22];

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (v) => Math.abs(v) >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toFixed(2)}`;
const fmtY = (v) => Math.abs(v) >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toFixed(0)}`;

// ─── Slider component ─────────────────────────────────────────────────────────
function Slider({ label, value, display, min, max, step, onChange }) {
  return (
    <div className="space-y-2 rounded-xl border border-stone-200 p-4 dark:border-transparent">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <span className="text-lg font-black text-ink">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-hi accent-stone-900 dark:accent-zinc-100"
      />
      <div className="flex justify-between text-xs text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ProjectionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-surface-hi bg-surface px-4 py-3 shadow-soft text-sm">
      <p className="mb-2 font-bold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

function StackedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div className="rounded-xl border border-surface-hi bg-surface px-4 py-3 shadow-soft text-sm">
      <p className="mb-2 font-bold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }} className="font-semibold">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
      <p className="mt-1 border-t border-surface-hi pt-1 font-bold text-ink">Total: {fmt(total)}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RevenueModel() {
  const [commRate, setCommRate] = useState(10);   // percentage
  const [groceryFee, setGroceryFee] = useState(18);
  const [prescFee, setPrescFee] = useState(15);
  const [groceryMix, setGroceryMix] = useState(60); // percentage
  const [subMix, setSubMix] = useState(30);          // percentage

  const cr = commRate / 100;
  const gm = groceryMix / 100;
  const sm = subMix / 100;

  // Unit economics
  const netGrocery = calcNet(groceryFee, cr);
  const netPresc = calcNet(prescFee, cr);
  const netBlended = blendedNet(groceryFee, prescFee, cr, gm);

  const m6Volume = VOLUMES.base[5];
  const m6OneOff = m6Volume * (1 - sm) * netBlended;
  const m6Sub = subscriptionMargin(m6Volume, sm, cr);
  const m6Total = m6OneOff + m6Sub;

  // Projection chart data
  const projectionData = useMemo(() => MONTHS.map((month, i) => {
    const calc = (vols) => {
      const v = vols[i];
      return v * (1 - sm) * blendedNet(groceryFee, prescFee, cr, gm) + subscriptionMargin(v, sm, cr);
    };
    return {
      month,
      Conservative: calc(VOLUMES.conservative),
      'Base case': calc(VOLUMES.base),
      Optimistic: calc(VOLUMES.optimistic),
    };
  }), [cr, gm, sm, groceryFee, prescFee]);

  // Sensitivity bar data
  const sensitivityData = useMemo(() => COMM_RATES.map((rate) => ({
    rate: `${rate}%`,
    net: calcNet(groceryFee, rate / 100),
    active: Math.abs(rate - commRate) < 0.01,
  })), [groceryFee, commRate]);

  // Stacked bar data
  const stackedData = useMemo(() => MONTHS.map((month, i) => {
    const v = VOLUMES.base[i];
    return {
      month,
      'One-off': Math.max(0, v * (1 - sm) * netBlended),
      Subscription: Math.max(0, subscriptionMargin(v, sm, cr)),
    };
  }), [cr, gm, sm, groceryFee, prescFee, netBlended]);

  const chartTextColor = 'var(--chart-bar)';

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Admin · Internal</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Revenue Model Explorer</h1>
        <p className="mt-1 text-stone-400">Adjust any assumption below — charts update instantly.</p>
      </div>

      {/* Section 1 — Sliders */}
      <Card className="space-y-6">
        <h2 className="text-lg font-bold text-ink">Assumptions</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Slider
            label="Commission rate"
            value={commRate}
            display={`${commRate.toFixed(1)}%`}
            min={8} max={22} step={0.5}
            onChange={setCommRate}
          />
          <Slider
            label="Grocery service fee"
            value={groceryFee}
            display={`£${groceryFee}`}
            min={12} max={28} step={1}
            onChange={setGroceryFee}
          />
          <Slider
            label="Prescription service fee"
            value={prescFee}
            display={`£${prescFee}`}
            min={10} max={24} step={1}
            onChange={setPrescFee}
          />
          <Slider
            label="Grocery % of bookings"
            value={groceryMix}
            display={`${groceryMix}%`}
            min={30} max={80} step={5}
            onChange={setGroceryMix}
          />
          <Slider
            label="% of customers on subscription"
            value={subMix}
            display={`${subMix}%`}
            min={5} max={60} step={5}
            onChange={setSubMix}
          />
        </div>
      </Card>

      {/* Section 2 — Unit economics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-bold text-muted">Net / grocery booking</p>
          <p className="mt-2 text-3xl font-black text-ink">{fmt(netGrocery)}</p>
          <p className="mt-1 text-xs text-muted">after Stripe + Connect fees</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted">Net / prescription booking</p>
          <p className="mt-2 text-3xl font-black text-ink">{fmt(netPresc)}</p>
          <p className="mt-1 text-xs text-muted">after Stripe + Connect fees</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-muted">Blended net / booking</p>
          <p className="mt-2 text-3xl font-black text-ink">{fmt(netBlended)}</p>
          <p className="mt-1 text-xs text-muted">{groceryMix}% grocery · {100 - groceryMix}% prescription</p>
        </Card>
        <div className="rounded-2xl bg-emerald-500 p-5 shadow-soft">
          <p className="text-sm font-bold text-emerald-100">Base case — month 6 total</p>
          <p className="mt-2 text-3xl font-black text-white">{fmt(m6Total)}</p>
          <p className="mt-1 text-xs text-emerald-100">{fmt(m6OneOff)} one-off · {fmt(m6Sub)} subscriptions</p>
        </div>
      </div>

      {/* Section 3 — Projection line chart */}
      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-ink">Revenue projections — M1 to M6</h2>

        {/* Custom legend */}
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-stone-900 dark:border-zinc-300" />
            <span className="text-muted">Conservative</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-6 bg-secondary" style={{ height: 3 }} />
            <span className="text-ink">Base case</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-stone-400" />
            <span className="text-muted">Optimistic</span>
          </span>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={projectionData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-hi, #e7e5e4)" />
            <XAxis dataKey="month" tick={{ fill: chartTextColor, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtY} tick={{ fill: chartTextColor, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<ProjectionTooltip />} />
            <Line type="monotone" dataKey="Conservative" stroke="#1C1917" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            <Line type="monotone" dataKey="Base case" stroke="#10B981" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Optimistic" stroke="#A8A29E" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Section 4 — Two charts */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Commission sensitivity */}
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Commission sensitivity</h2>
            <p className="text-sm text-muted">Net per £{groceryFee} grocery booking at each rate</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sensitivityData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-hi, #e7e5e4)" vertical={false} />
              <XAxis dataKey="rate" tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `£${v.toFixed(0)}`} tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => [`£${v.toFixed(2)}`, 'Net margin']} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {sensitivityData.map((entry, i) => (
                  <Cell key={i} fill={entry.active ? '#10B981' : '#D6D3D1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Subscription vs one-off stacked */}
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Subscription vs one-off</h2>
            <p className="text-sm text-muted">Base case monthly margin breakdown</p>
          </div>

          <div className="flex gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-300" /> One-off</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-secondary" /> Subscription</span>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stackedData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-hi, #e7e5e4)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtY} tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<StackedTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="One-off" stackId="a" fill="#6EE7B7" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Subscription" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
