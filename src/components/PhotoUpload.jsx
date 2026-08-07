import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import Button from './Button';

// Downscale in the browser before upload. A modern phone photo is 3–6MB, which
// is pointless for "show me which loaf" and would be slow to send on shop wifi —
// 1000px on the long edge is plenty to identify a product.
const MAX_EDGE = 1000;
const QUALITY = 0.72;

const downscale = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read that file'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('That file is not an image we can read'));
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

export default function PhotoUpload({ photos = [], onAdd, onRemove, kind, label, hint, max = 6, disabled = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);

  const mine = photos.filter((photo) => photo.kind === kind);

  const pick = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;

    setBusy(true);
    setError('');
    try {
      for (const file of files.slice(0, max - mine.length)) {
        if (!file.type.startsWith('image/')) throw new Error('Please choose an image');
        const dataUrl = await downscale(file);
        await onAdd({ kind, dataUrl });
      }
    } catch (err) {
      setError(err.message || 'Could not add that photo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-bold text-muted">{label}</p>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </div>

      {mine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mine.map((photo) => (
            <div key={photo.id} className="relative">
              <button type="button" onClick={() => setViewing(photo)} className="block">
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || 'Booking photo'}
                  className="h-20 w-20 rounded-lg border border-surface-hi object-cover"
                />
              </button>
              {onRemove && !disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  aria-label="Remove photo"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white shadow"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && mine.length < max && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={pick}
          />
          <Button type="button" variant="outline" loading={busy} onClick={() => inputRef.current?.click()}>
            <Camera size={16} /> {mine.length ? 'Add another' : 'Add a photo'}
          </Button>
        </>
      )}

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <img src={viewing.dataUrl} alt={viewing.caption || 'Booking photo'} className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
