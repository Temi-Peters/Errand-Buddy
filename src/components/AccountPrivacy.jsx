import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import Button from './Button';
import Card from './Card';
import Modal from './Modal';
import { useApp } from '../context/AppContext';

export default function AccountPrivacy() {
  const { deleteMyAccount, showToast } = useApp();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const downloadData = async () => {
    setExporting(true);
    try {
      const data = await api.accountExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'errandbuddy-my-data.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Your data has been downloaded');
    } catch (err) {
      showToast(err.message || 'Could not export your data', 'error');
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!password) { showToast('Enter your password to confirm.', 'error'); return; }
    setDeleting(true);
    try {
      await deleteMyAccount(password);
      navigate('/', { replace: true });
    } catch (err) {
      showToast(err.message || 'Could not delete your account', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-secondary" />
          <h2 className="text-lg font-bold text-ink">Your data &amp; privacy</h2>
        </div>
        <p className="text-sm text-muted">Under UK data protection law you can download a copy of your personal data, or permanently delete your account at any time.</p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="text-sm" loading={exporting} onClick={downloadData}>
            <Download size={14} /> Download my data
          </Button>
          <Button variant="ghost" className="text-sm text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => { setPassword(''); setConfirming(true); }}>
            <Trash2 size={14} /> Delete my account
          </Button>
        </div>
      </Card>

      {confirming && (
        <Modal title="Delete your account" onClose={() => setConfirming(false)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              This permanently deletes your account and all associated data — bookings, messages, wallet history and more. <strong>This cannot be undone.</strong>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">Enter your password to confirm</label>
              <input
                type="password"
                className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" loading={deleting} disabled={!password} onClick={confirmDelete}>
                Permanently delete
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
