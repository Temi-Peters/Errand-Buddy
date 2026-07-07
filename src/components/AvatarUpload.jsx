import { useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import Avatar from './Avatar';
import Card from './Card';
import { useApp } from '../context/AppContext';

// Downscale to a small square JPEG data URL so avatars stay tiny (~10–40KB).
const downscale = (file, max = 256) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

export default function AvatarUpload({ profile }) {
  const { updateProfile, showToast } = useApp();
  const [saving, setSaving] = useState(false);

  const onFile = async (file) => {
    if (!file) return;
    setSaving(true);
    try {
      const avatarUrl = await downscale(file);
      await updateProfile({ avatarUrl });
      showToast('Profile photo updated');
    } catch {
      showToast('Could not update your photo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await updateProfile({ avatarUrl: '' });
      showToast('Profile photo removed');
    } catch {
      showToast('Could not remove your photo', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex items-center gap-4">
      <Avatar url={profile?.avatarUrl} name={profile?.name} size={64} />
      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">Profile photo</p>
        <div className="flex flex-wrap gap-2">
          <label className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-surface-hi px-3 text-sm font-semibold text-ink transition hover:bg-surface-hi ${saving ? 'opacity-60' : ''}`}>
            <Camera size={14} /> {saving ? 'Saving…' : profile?.avatarUrl ? 'Change' : 'Upload'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={saving} onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {profile?.avatarUrl && (
            <button onClick={remove} disabled={saving} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted transition hover:text-red-500">
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
