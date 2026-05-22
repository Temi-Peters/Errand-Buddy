import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const isError = toast.type === 'error';

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-lg p-4 text-white shadow-soft sm:left-auto sm:w-96 ${isError ? 'bg-red-500' : 'bg-secondary'}`}>
      {isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
      <p className="font-semibold">{toast.message}</p>
    </div>
  );
}
