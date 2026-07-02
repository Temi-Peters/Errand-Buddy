import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Star } from 'lucide-react';
import { api } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';

const ORDER = {
  wouldUse: ['Yes', 'Maybe', 'No'],
  pricePreference: ['Under £10', '£10–15', '£15–20', '£20–25', 'Over £25'],
  standoutFeature: ['Carer-assisted booking', 'Prepaid wallet', 'Vetted local runners', 'Live status updates']
};

const Stat = ({ label, value }) => (
  <div className="rounded-xl bg-surface-hi p-4">
    <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
    <p className="mt-1 text-3xl font-black text-ink">{value}</p>
  </div>
);

const Bars = ({ title, counts, order, total }) => {
  const keys = order ? order.filter((k) => counts[k] != null) : Object.keys(counts);
  const extra = Object.keys(counts).filter((k) => !keys.includes(k));
  const all = [...keys, ...extra];
  return (
    <Card className="space-y-3">
      <p className="text-sm font-bold text-ink">{title}</p>
      {all.length === 0 && <p className="text-sm text-muted">No responses yet.</p>}
      {all.map((k) => {
        const n = counts[k] || 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        return (
          <div key={k}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted">{k}</span>
              <span className="font-semibold text-ink">{n} · {pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-hi">
              <div className="h-full rounded-full bg-stone-900 transition-all dark:bg-zinc-100" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </Card>
  );
};

export default function SurveyResults() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setData(await api.feedbackResults()); } catch { /* keep last data */ } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // live refresh during Q&A
    return () => clearInterval(t);
  }, []);

  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Live results</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Value-proposition survey</h1>
            <p className="mt-1 text-stone-400">Updates automatically as people respond.</p>
          </div>
          <Button as={Link} to="/admin" variant="white" className="shrink-0 text-sm"><ArrowLeft size={14} /> Admin</Button>
        </div>
      </div>

      {loading && !data ? (
        <p className="py-10 text-center text-muted">Loading results…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Responses" value={total} />
            <Stat label="Avg value" value={`${data.avgRating}/5`} />
            <Stat label="Would use (Yes)" value={`${total ? Math.round(((data.wouldUse?.Yes || 0) / total) * 100) : 0}%`} />
            <Stat label="Emails captured" value={data.emailsCaptured} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Bars title="Would you use it?" counts={data.wouldUse || {}} order={ORDER.wouldUse} total={total} />
            <Bars title="Standout feature" counts={data.standoutFeature || {}} order={ORDER.standoutFeature} total={total} />
            <Bars title="Would pay (one-off)" counts={data.pricePreference || {}} order={ORDER.pricePreference} total={total} />
          </div>

          <Card className="space-y-3">
            <p className="text-sm font-bold text-ink">Value rating (1–5)</p>
            {data.ratingDistribution.map(({ rating, count }) => {
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={rating}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted">{rating} <Star size={13} className="text-amber-500" fill="currentColor" /></span>
                    <span className="font-semibold text-ink">{count} · {pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-hi">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </Card>

          <Card>
            <p className="mb-3 text-sm font-bold text-ink">Comments {data.comments.length > 0 && `(${data.comments.length})`}</p>
            {data.comments.length === 0 ? (
              <p className="text-sm text-muted">No written comments yet.</p>
            ) : (
              <div className="space-y-3">
                {data.comments.map((c, i) => (
                  <div key={i} className="rounded-xl bg-surface-hi p-3">
                    <p className="text-sm text-ink">"{c.comment}"</p>
                    {c.email && <p className="mt-1 text-xs text-muted">{c.email}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
