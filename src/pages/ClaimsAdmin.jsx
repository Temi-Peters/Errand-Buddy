import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const statusStyles = {
  Open: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/30',
  Resolved: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/30',
  Rejected: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-700/30'
};

const Pill = ({ status }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status] || statusStyles.Open}`}>{status}</span>
);

function ClaimResolver({ claim, onResolve }) {
  const [action, setAction] = useState('resolve');
  const [refund, setRefund] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await onResolve(claim.id, {
        action,
        note: note.trim() || undefined,
        ...(action === 'resolve' && Number(refund) > 0 ? { refundAmount: Number(refund) } : {})
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-surface-hi pt-4">
      <div className="flex gap-2">
        {['resolve', 'reject'].map((a) => (
          <button key={a} type="button" onClick={() => setAction(a)}
            className={`min-h-10 flex-1 rounded-lg border px-3 text-sm font-semibold capitalize transition ${action === a ? 'border-stone-900 bg-stone-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-surface-hi text-muted hover:text-ink'}`}>
            {a}
          </button>
        ))}
      </div>
      {action === 'resolve' && (
        <div>
          <label className="mb-1 block text-xs font-bold text-muted">Refund amount (£, optional — max £{claim.booking?.price?.toFixed(2)})</label>
          <input type="number" min="0" step="0.01" className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm" placeholder="0.00" value={refund} onChange={(e) => setRefund(e.target.value)} />
        </div>
      )}
      <textarea className="focus-ring min-h-20 w-full rounded-lg border border-surface-hi p-3 text-sm" placeholder="Note to the customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button className="w-full" loading={loading} onClick={submit}>
        {action === 'resolve' ? (Number(refund) > 0 ? `Resolve & refund £${Number(refund).toFixed(2)}` : 'Mark resolved') : 'Reject claim'}
      </Button>
    </div>
  );
}

export default function ClaimsAdmin() {
  const { claims, fetchClaims, resolveClaim } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaims().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = claims.filter((c) => c.status === 'Open');
  const closed = claims.filter((c) => c.status !== 'Open');

  const renderClaim = (claim, resolvable) => (
    <Card key={claim.id} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink">{claim.category}</p>
          <p className="text-sm text-muted">{claim.customer?.name} · {claim.booking?.serviceType} · {claim.booking?.date} · £{claim.booking?.price?.toFixed(2)}</p>
        </div>
        <Pill status={claim.status} />
      </div>
      <p className="rounded-xl bg-surface-hi p-3 text-sm text-ink">{claim.description}</p>
      {claim.resolutionNote && (
        <p className="text-sm text-muted"><span className="font-semibold text-ink">Response:</span> {claim.resolutionNote}</p>
      )}
      {claim.refundAmount != null && (
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Refunded £{claim.refundAmount.toFixed(2)}</p>
      )}
      {resolvable && <ClaimResolver claim={claim} onResolve={resolveClaim} />}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Trust &amp; safety</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-black text-ink"><ShieldAlert size={26} /> Claims</h1>
        </div>
        <Button as={Link} to="/admin" variant="outline" className="text-sm"><ArrowLeft size={14} /> Back to admin</Button>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}

      {!loading && claims.length === 0 && (
        <Card className="border-dashed py-10 text-center">
          <ShieldAlert className="mx-auto text-muted" size={32} />
          <p className="mt-3 font-bold text-muted">No claims yet</p>
          <p className="mt-1 text-sm text-muted">When a customer reports an issue with a booking, it'll appear here for you to resolve.</p>
        </Card>
      )}

      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Open — needs action ({open.length})</h2>
          {open.map((c) => renderClaim(c, true))}
        </section>
      )}

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Resolved &amp; rejected</h2>
          {closed.map((c) => renderClaim(c, false))}
        </section>
      )}
    </div>
  );
}
