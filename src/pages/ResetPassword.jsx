import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('The two passwords don\'t match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <h1 className="text-3xl font-black">Link not valid</h1>
          <p className="mt-3 text-muted">This page needs a reset link from your email. Request a new one and try again.</p>
          <div className="mt-6">
            <Link to="/forgot-password"><Button className="w-full">Request a reset link</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <h1 className="text-3xl font-black">Password updated</h1>
          <p className="mt-3 text-muted">You can now log in with your new password. Any other devices you were signed in on have been signed out.</p>
          <div className="mt-6">
            <Button className="w-full" onClick={() => navigate('/login')}>Go to log in</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-3xl font-black">Choose a new password</h1>
        <p className="mt-2 text-muted">Pick something at least 8 characters long.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-semibold">New password</span>
            <input
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="font-semibold">Confirm new password</span>
            <input
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" loading={loading}>Set new password</Button>
        </form>
        <p className="mt-5 text-sm text-muted">
          Link expired? <Link className="font-bold text-primary" to="/forgot-password">Request a new one</Link>.
        </p>
      </Card>
    </div>
  );
}
