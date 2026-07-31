import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useApp } from '../context/AppContext';

const dashboardFor = (role) => role === 'runner' ? '/runner/dashboard' : role === 'admin' ? '/admin' : '/customer/dashboard';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSlow(false);
    // The API sleeps when idle and can take the best part of a minute to wake.
    // Without a word of explanation people assume it's broken and start tapping.
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    try {
      const user = await login(form);
      navigate(location.state?.from || dashboardFor(user.role));
    } catch {
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-3xl font-black">Log in</h1>
        <p className="mt-2 text-muted">Access your ErrandBuddy account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-semibold">Email</span>
            <input className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </label>
          <label className="block">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Password</span>
              <Link className="text-sm font-semibold text-primary hover:underline" to="/forgot-password">Forgot password?</Link>
            </div>
            <input className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
          </label>
          <Button className="w-full" type="submit" loading={loading}>Log in</Button>
          {slow ? (
            <p className="text-center text-sm text-muted">
              Just waking things up — this can take up to a minute the first time today. Please don't close the page.
            </p>
          ) : null}
        </form>
        <p className="mt-5 text-sm text-muted">New here? <Link className="font-bold text-primary" to="/register">Create a customer account</Link> or <Link className="font-bold text-primary" to="/become-a-runner">apply to become a runner</Link>.</p>
      </Card>
    </div>
  );
}
