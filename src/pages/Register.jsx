import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { useApp } from '../context/AppContext';

const baseForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  postcodeArea: 'Oadby',
  area: 'Oadby',
  bio: '',
  transportMethod: '',
  availabilityNotes: '',
  agreement: false
};

export default function Register() {
  const location = useLocation();
  const initialRole = location.state?.role === 'runner' ? 'runner' : 'customer';
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState(baseForm);
  const [loading, setLoading] = useState(false);
  const { register } = useApp();
  const navigate = useNavigate();

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await register({ ...form, role });
      navigate(user.role === 'runner' ? '/runner/dashboard' : '/welcome');
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <h1 className="text-3xl font-black">{role === 'runner' ? 'Runner application' : 'Create customer account'}</h1>
        <p className="mt-2 text-muted">{role === 'runner' ? 'Apply to complete local errands in your area.' : 'Book trusted local help in your area.'}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setRole('customer')} className={`min-h-11 rounded-lg border px-3 font-bold ${role === 'customer' ? 'border-stone-900 bg-stone-50 text-ink dark:border-zinc-400 dark:bg-zinc-900' : 'border-surface-hi bg-surface text-ink'}`}>Customer</button>
          <button type="button" onClick={() => setRole('runner')} className={`min-h-11 rounded-lg border px-3 font-bold ${role === 'runner' ? 'border-stone-900 bg-stone-50 text-ink dark:border-zinc-400 dark:bg-zinc-900' : 'border-surface-hi bg-surface text-ink'}`}>Runner</button>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" placeholder="Full name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" type="password" placeholder="Password, minimum 8 characters" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={8} />
          <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" placeholder="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
          {role === 'customer' ? (
            <>
              <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" placeholder="Address" value={form.address} onChange={(e) => update('address', e.target.value)} required />
              <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" placeholder="Postcode area" value={form.postcodeArea} onChange={(e) => update('postcodeArea', e.target.value)} required />
            </>
          ) : (
            <>
              <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" placeholder="Area you cover" value={form.area} onChange={(e) => update('area', e.target.value)} required />
              <input className="focus-ring min-h-11 rounded-lg border border-slate-200 px-3" placeholder="Transport method" value={form.transportMethod} onChange={(e) => update('transportMethod', e.target.value)} required />
              <textarea className="focus-ring min-h-24 rounded-lg border border-slate-200 p-3" placeholder="Short bio" value={form.bio} onChange={(e) => update('bio', e.target.value)} />
              <textarea className="focus-ring min-h-24 rounded-lg border border-slate-200 p-3" placeholder="Availability notes" value={form.availabilityNotes} onChange={(e) => update('availabilityNotes', e.target.value)} />
              <label className="flex items-start gap-3 text-sm text-muted"><input className="mt-1" type="checkbox" checked={form.agreement} onChange={(e) => update('agreement', e.target.checked)} required /> I confirm I am 18 or over, reliable, based locally, able to travel in my area, and understand approval checks are required.</label>
            </>
          )}
          <Button className="w-full" type="submit" loading={loading}>{role === 'runner' ? 'Submit application' : 'Create account'}</Button>
        </form>
        <p className="mt-5 text-sm text-muted">Already registered? <Link className="font-semibold text-ink underline" to="/login">Log in</Link>.</p>
      </Card>
    </div>
  );
}
