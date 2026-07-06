import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Upload } from 'lucide-react';
import { api } from '../api/client';
import Card from './Card';
import { useApp } from '../context/AppContext';

const SLOTS = [
  { type: 'ID', label: 'Photo ID', hint: 'Passport or driving licence' },
  { type: 'PROOF_OF_ADDRESS', label: 'Proof of address', hint: 'Bank statement or utility bill, last 3 months' }
];

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function RunnerVerification() {
  const { showToast } = useApp();
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(null);

  const load = () => api.runnerDocsMine().then((r) => setDocs(r.documents || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const uploaded = (type) => docs.find((d) => d.type === type);

  const onFile = async (type, file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showToast('File must be 8MB or smaller', 'error'); return; }
    setUploading(type);
    try {
      const dataBase64 = await readAsDataUrl(file);
      await api.uploadRunnerDoc({ type, fileName: file.name, mimeType: file.type, dataBase64 });
      await load();
      showToast('Document uploaded');
    } catch (err) {
      showToast(err.message || 'Upload failed — please try again', 'error');
    } finally {
      setUploading(null);
    }
  };

  const bothUploaded = SLOTS.every((s) => uploaded(s.type));

  return (
    <Card className="space-y-4 border-amber-300 dark:border-amber-800">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-amber-500" />
        <h2 className="text-lg font-bold text-ink">Verify your identity</h2>
      </div>
      <p className="text-sm text-muted">
        Before you can accept tasks, we need to verify who you are. Upload a photo ID and proof of address below.
        Our team reviews them, then <strong>deletes them once you're approved</strong> — we don't keep your documents on file.
      </p>

      <div className="space-y-3">
        {SLOTS.map(({ type, label, hint }) => {
          const done = uploaded(type);
          return (
            <div key={type} className="flex items-center justify-between gap-3 rounded-xl border border-surface-hi p-3">
              <div>
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-xs text-muted">{done ? done.fileName : hint}</p>
              </div>
              <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${done ? 'text-secondary' : 'border border-surface-hi text-ink hover:bg-surface-hi'}`}>
                {done ? <><CheckCircle2 size={16} /> Replace</> : <>{uploading === type ? 'Uploading…' : <><Upload size={14} /> Upload</>}</>}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  disabled={uploading === type}
                  onChange={(e) => onFile(type, e.target.files?.[0])}
                />
              </label>
            </div>
          );
        })}
      </div>

      <p className={`text-sm font-semibold ${bothUploaded ? 'text-secondary' : 'text-muted'}`}>
        {bothUploaded
          ? 'Thanks — both documents received. An admin will review and approve your account shortly.'
          : 'Your application is pending. Upload both documents to speed up approval.'}
      </p>
    </Card>
  );
}
