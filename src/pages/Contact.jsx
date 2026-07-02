import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, MessageSquare, MapPin } from 'lucide-react';
import { api } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import { useApp } from '../context/AppContext';

export default function Contact() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ready = form.name.trim() && form.email.trim() && form.message.trim().length >= 5;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) { showToast('Please fill in your name, email and a short message.', 'error'); return; }
    setLoading(true);
    try {
      await api.submitContact(form);
      setSent(true);
    } catch (err) {
      showToast(err.message || 'Could not send — please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-ink">Get in touch</h1>
        <p className="mt-2 text-muted">Questions about a booking, becoming a runner, or partnering with us? Send us a message.</p>
      </div>

      {sent ? (
        <Card className="py-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <CheckCircle2 size={30} />
          </span>
          <h2 className="mt-5 text-2xl font-black text-ink">Message sent.</h2>
          <p className="mx-auto mt-2 max-w-sm text-muted">Thanks for reaching out — we'll get back to you at {form.email} soon.</p>
          <Button as={Link} to="/" className="mt-6">Back to ErrandBuddy</Button>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-5">
          <Card as="form" className="space-y-4 md:col-span-3" onSubmit={submit}>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">Your name</label>
              <input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm" placeholder="Jane Smith" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">Email</label>
              <input type="email" className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">Message</label>
              <textarea className="focus-ring min-h-32 w-full rounded-lg border border-surface-hi p-3 text-sm" placeholder="How can we help?" value={form.message} onChange={(e) => set('message', e.target.value)} />
            </div>
            <Button type="submit" className="w-full" loading={loading} disabled={!ready}>Send message</Button>
          </Card>

          <div className="space-y-4 md:col-span-2">
            <Card className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hi text-ink"><Mail size={18} /></span>
                <div>
                  <p className="text-sm font-bold text-ink">Email</p>
                  <a href="mailto:hello@errandbuddy.uk" className="text-sm text-primary hover:underline">hello@errandbuddy.uk</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hi text-ink"><MessageSquare size={18} /></span>
                <div>
                  <p className="text-sm font-bold text-ink">Booked already?</p>
                  <p className="text-sm text-muted">Message your runner from your dashboard.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hi text-ink"><MapPin size={18} /></span>
                <div>
                  <p className="text-sm font-bold text-ink">Where we operate</p>
                  <p className="text-sm text-muted">South-east Leicester — Oadby, Stoneygate, Knighton, Clarendon Park, Evington.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
