import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star } from 'lucide-react';
import { api } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import { useApp } from '../context/AppContext';

const WOULD_USE = ['Yes', 'Maybe', 'No'];
const PRICES = ['Under £10', '£10–15', '£15–20', '£20–25', 'Over £25'];
const FEATURES = ['Carer-assisted booking', 'Prepaid wallet', 'Vetted local runners', 'Live status updates'];

const Field = ({ label, children }) => (
  <div>
    <p className="mb-2 text-sm font-bold text-ink">{label}</p>
    {children}
  </div>
);

const Options = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition ${
          value === opt
            ? 'border-stone-900 bg-stone-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
            : 'border-surface-hi text-muted hover:border-stone-400 hover:text-ink'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default function Feedback() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ wouldUse: '', valueRating: 0, pricePreference: '', standoutFeature: '', comment: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ready = form.wouldUse && form.valueRating && form.pricePreference && form.standoutFeature;

  const submit = async () => {
    if (!ready) { showToast('Please answer the first four questions.', 'error'); return; }
    setLoading(true);
    try {
      await api.submitFeedback(form);
      setDone(true);
    } catch (err) {
      showToast(err.message || 'Could not submit — please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="mt-5 text-3xl font-black text-ink">Thank you.</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">Your feedback helps shape ErrandBuddy. We really appreciate you taking the time.</p>
        <Button as={Link} to="/" className="mt-6">Back to ErrandBuddy</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-ink">What do you think?</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">You've had a look at ErrandBuddy — help us make it better. Takes under a minute, and it's anonymous.</p>
      </div>

      <Card className="space-y-6">
        <Field label="Would you use ErrandBuddy?">
          <Options options={WOULD_USE} value={form.wouldUse} onChange={(v) => set('wouldUse', v)} />
        </Field>

        <Field label="How valuable is this for you or someone you know?">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set('valueRating', n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className={`transition ${n <= form.valueRating ? 'text-amber-500' : 'text-surface-hi hover:text-amber-300'}`}>
                <Star size={30} fill={n <= form.valueRating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="What would you pay for a one-off errand?">
          <Options options={PRICES} value={form.pricePreference} onChange={(v) => set('pricePreference', v)} />
        </Field>

        <Field label="Which feature stands out most?">
          <Options options={FEATURES} value={form.standoutFeature} onChange={(v) => set('standoutFeature', v)} />
        </Field>

        <Field label="Anything you'd change or add? (optional)">
          <textarea
            className="focus-ring min-h-24 w-full rounded-lg border border-surface-hi p-3 text-sm"
            placeholder="Your thoughts…"
            value={form.comment}
            onChange={(e) => set('comment', e.target.value)}
          />
        </Field>

        <Field label="Want early access? Leave your email (optional)">
          <input
            type="email"
            className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Button className="w-full" loading={loading} disabled={!ready} onClick={submit}>
          Submit feedback
        </Button>
      </Card>
    </div>
  );
}
