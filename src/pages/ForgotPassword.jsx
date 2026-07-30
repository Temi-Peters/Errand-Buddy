import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email);
      // The API answers identically whether or not the account exists, and so
      // does this screen — it must not become a way to test who is registered.
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <h1 className="text-3xl font-black">Check your email</h1>
          <p className="mt-3 text-muted">
            If an account exists for <span className="font-semibold text-ink">{email}</span>, we've sent a link to reset your password. It works once and expires in an hour.
          </p>
          <p className="mt-3 text-sm text-muted">
            Nothing after a few minutes? Check your spam folder, or <button type="button" className="font-bold text-primary underline" onClick={() => setSent(false)}>try a different email</button>.
          </p>
          <div className="mt-6">
            <Link to="/login"><Button className="w-full" variant="outline">Back to log in</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-3xl font-black">Forgot your password?</h1>
        <p className="mt-2 text-muted">Enter your email and we'll send you a link to set a new one.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-semibold">Email</span>
            <input
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" loading={loading}>Send reset link</Button>
        </form>
        <p className="mt-5 text-sm text-muted">
          Remembered it? <Link className="font-bold text-primary" to="/login">Back to log in</Link>.
        </p>
      </Card>
    </div>
  );
}
