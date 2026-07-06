import { useEffect, useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { api } from '../api/client';
import Button from './Button';
import { useApp } from '../context/AppContext';

export default function RunnerDocReview({ runner }) {
  const { updateRunnerStatus, showToast } = useApp();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

      <p className="mt-3 text-xs text-muted">Documents are permanently deleted the moment you approve or reject.</p>
      <div className="mt-2 flex gap-2">
        <Button className="text-sm" onClick={() => updateRunnerStatus(runner.id, 'ACTIVE')}>Approve</Button>
        <Button variant="danger" className="text-sm" onClick={() => updateRunnerStatus(runner.id, 'REJECTED', 'Application was not approved.')}>Reject</Button>
      </div>
    </div>
  );
}
