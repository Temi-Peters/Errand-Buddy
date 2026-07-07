import { useEffect, useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { api } from '../api/client';
import Button from './Button';
import { useApp } from '../context/AppContext';

export default function RunnerDocReview({ runner }) {
  const { updateRunnerStatus, rejectRunner, showToast } = useApp();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [blockEmail, setBlockEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRejecting(false); setReason(''); setBlockEmail(false);
    if (!runner || runner.status !== 'Pending') { setDocs([]); return; }
    setLoading(true);
    api.runnerDocs(runner.id)
      .then((r) => setDocs(r.documents || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [runner?.id, runner?.status]);

  if (!runner || runner.status !== 'Pending') return null;

  const view = async (docId) => {
    try {
      const url = await api.runnerDocObjectUrl(docId);
      window.open(url, '_blank', 'noopener');
    } catch {
      showToast('Could not open document', 'error');
    }
  };

  const approve = async () => {
    setBusy(true);
    try { await updateRunnerStatus(runner.id, 'ACTIVE'); } finally { setBusy(false); }
  };

  const confirmReject = async () => {
    setBusy(true);
    try {
      await rejectRunner(runner.id, { reason: reason.trim() || undefined, blockEmail });
    } catch { /* toast shown by context */ } finally { setBusy(false); }
  };

  return (
    <div className="mt-4 rounded-xl border border-surface-hi p-3">
      <div className="flex items-center gap-2">
        <FileText size={15} className="text-muted" />
        <p className="text-sm font-bold text-ink">Verification documents</p>
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-muted">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">No documents submitted yet — approving without checking ID is not recommended.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">{d.type === 'ID' ? 'Photo ID' : 'Proof of address'} <span className="text-xs">· {d.fileName}</span></span>
              <Button variant="outline" className="text-xs" onClick={() => view(d.id)}><Eye size={13} /> View</Button>
            </div>
          ))}
        </div>
      )}

      {!rejecting ? (
        <>
          <p className="mt-3 text-xs text-muted">Approving deletes the documents. Rejecting deletes the whole application.</p>
          <div className="mt-2 flex gap-2">
            <Button className="text-sm" loading={busy} onClick={approve}>Approve</Button>
            <Button variant="danger" className="text-sm" onClick={() => setRejecting(true)}>Reject</Button>
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300">Rejecting permanently deletes this application. The applicant is emailed the reason below.</p>
          <textarea
            className="focus-ring min-h-16 w-full rounded-lg border border-surface-hi p-2 text-sm"
            placeholder="Reason (shown to the applicant)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={blockEmail} onChange={(e) => setBlockEmail(e.target.checked)} />
            Block this email from re-registering
          </label>
          <div className="flex gap-2">
            <Button variant="danger" className="text-sm" loading={busy} onClick={confirmReject}>Confirm rejection</Button>
            <Button variant="outline" className="text-sm" onClick={() => setRejecting(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
