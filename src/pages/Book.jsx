import { Elements } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import CheckoutForm from '../components/CheckoutForm';
import ServiceCard from '../components/ServiceCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { areas, bookableServiceTypes } from '../data/options';
import { stripePromise } from '../lib/stripe';

const blankForm = {
  serviceType: '',
  bookingType: '',
  subscription: '1 task/week',
  price: 0,
  date: '',
  time: '',
  instructions: '',
  address: '',
  contactPhone: '',
  postcodeArea: 'Oadby'
};

const subscriptionPrices = {
  '1 task/week': 20,
  '2 tasks/week': 38,
  '3 tasks/week': 54
};

export default function Book() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(blankForm);
  const [confirmed, setConfirmed] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { authUser, customers, showToast, wallet, fetchWallet } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!authUser) navigate('/login', { state: { from: '/book' }, replace: true });
    if (authUser && authUser.role !== 'customer') navigate('/', { replace: true });
  }, [authUser, navigate]);

  // Pre-fill from a saved template if ?template=<id> is in the URL
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (!templateId || !authUser) return;

    api.getTemplate(templateId)
      .then(({ template }) => {
        setForm({
          serviceType: template.serviceType,
          bookingType: template.bookingType.includes('Weekly') ? 'Weekly subscription' : 'One-off task',
          subscription: template.subscription || '1 task/week',
          price: template.price,
          date: '',
          time: template.time,
          instructions: template.instructions,
          address: template.address,
          contactPhone: template.contactPhone,
          postcodeArea: template.postcodeArea
        });
        setStep(3);
      })
      .catch(() => {}); // silently ignore missing/invalid templates
  }, [searchParams, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const validate = () => {
    const rules = {
      1: form.serviceType,
      2: form.bookingType && form.price,
      3: form.date && form.time && form.instructions.trim().length > 5,
      4: form.address.trim() && form.contactPhone.trim() && form.postcodeArea,
    };
    if (!rules[step]) {
      showToast('Please complete this step before continuing.', 'error');
      return false;
    }
    return true;
  };

  const next = () => validate() && setStep((current) => current + 1);

  // Fetch wallet balance when reaching step 5 so we can show low-balance warning
  useEffect(() => {
    if (step === 5 && authUser?.role === 'customer') {
      fetchWallet().catch(() => {});
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the user reaches step 5, create the booking + Stripe PaymentIntent
  useEffect(() => {
    if (step !== 5 || clientSecret) return;

    const customer = customers.find((item) => item.id === authUser?.id);
    if (!customer) {
      showToast('Customer profile not ready. Please try again.', 'error');
      setStep(4);
      return;
    }

    setPaymentLoading(true);
    api.createBooking({
      serviceType: form.serviceType,
      bookingType: form.bookingType === 'Weekly subscription' ? `Weekly subscription - ${form.subscription}` : 'One-off task',
      subscription: form.subscription,
      date: form.date,
      time: form.time,
      price: Number(form.price),
      instructions: form.instructions,
      address: form.address,
      contactPhone: form.contactPhone,
      postcodeArea: form.postcodeArea
    })
      .then(({ booking, clientSecret: secret }) => {
        setConfirmed(booking);
        setClientSecret(secret);
      })
      .catch((err) => {
        showToast(err.message || 'Could not create booking. Please try again.', 'error');
        setStep(4);
      })
      .finally(() => setPaymentLoading(false));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaymentSuccess = () => {
    showToast('Payment confirmed!');
    setStep(6);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Book an errand</h1>
        <div className="mt-4 h-2 rounded-full bg-surface-hi">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(step, 6) / 6 * 100}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-muted">Step {step} of 6</p>
      </div>

      {step === 1 && <Card><h2 className="mb-4 text-xl font-bold">Choose a service</h2><div className="grid gap-4 sm:grid-cols-2">{bookableServiceTypes.map((service) => <ServiceCard key={service} service={service} selected={form.serviceType === service} onClick={() => update('serviceType', service)} />)}</div></Card>}

      {step === 2 && (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">Choose booking type</h2>
          <button className={`w-full rounded-lg border p-4 text-left ${form.bookingType === 'One-off task' ? 'border-stone-900 bg-stone-50 dark:border-zinc-400 dark:bg-zinc-900' : 'border-surface-hi'}`} onClick={() => setForm((current) => ({ ...current, bookingType: 'One-off task', price: 25 }))}>
            <strong>One-off task</strong><span className="block text-muted">from £25 per task</span>
          </button>
          <button className={`w-full rounded-lg border p-4 text-left ${form.bookingType === 'Weekly subscription' ? 'border-stone-900 bg-stone-50 dark:border-zinc-400 dark:bg-zinc-900' : 'border-surface-hi'}`} onClick={() => setForm((current) => ({ ...current, bookingType: 'Weekly subscription', price: subscriptionPrices[current.subscription] }))}>
            <strong>Weekly subscription</strong><span className="block text-muted">from £20/week — save vs one-off</span>
          </button>
          {form.bookingType === 'Weekly subscription' && (
            <select className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" value={form.subscription} onChange={(e) => setForm((current) => ({ ...current, subscription: e.target.value, price: subscriptionPrices[e.target.value] }))}>
              <option>1 task/week</option>
              <option>2 tasks/week</option>
              <option>3 tasks/week</option>
            </select>
          )}
        </Card>
      )}

      {step === 3 && <Card className="space-y-4"><h2 className="text-xl font-bold">Schedule and details</h2><input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /><input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" type="time" value={form.time} onChange={(e) => update('time', e.target.value)} /><textarea className="focus-ring min-h-32 w-full rounded-lg border border-surface-hi p-3" placeholder="Task details" value={form.instructions} onChange={(e) => update('instructions', e.target.value)} /></Card>}

      {step === 4 && <Card className="space-y-4"><h2 className="text-xl font-bold">Location and contact</h2><input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" placeholder="Address" value={form.address} onChange={(e) => update('address', e.target.value)} /><input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" placeholder="Contact phone" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} /><select className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" value={form.postcodeArea} onChange={(e) => update('postcodeArea', e.target.value)}>{areas.map((area) => <option key={area}>{area}</option>)}</select></Card>}

      {step === 5 && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">Payment</h2>
            <div className="mt-3 rounded-xl bg-surface-hi p-4">
              <p className="font-bold">{form.serviceType}</p>
              <p className="text-sm text-muted">{form.date} at {form.time}</p>
              <p className="mt-1 text-2xl font-black">£{form.price}</p>
            </div>
          </div>
          <div className={`rounded-xl border p-3 text-sm ${wallet.balance < 0 ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-surface-hi bg-surface-hi'}`}>
            <span className="font-semibold text-muted">Wallet balance: </span>
            <span className={`font-bold ${wallet.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-ink'}`}>£{wallet.balance.toFixed(2)}</span>
            {wallet.balance < 0 && (
              <p className="mt-1 text-red-600 dark:text-red-400">Your wallet balance is negative. Top it up in your dashboard after booking.</p>
            )}
            {wallet.balance >= 0 && wallet.balance < 20 && (
              <p className="mt-1 text-muted">Low balance — consider topping up your wallet before your runner shops for you.</p>
            )}
          </div>

          {paymentLoading && (
            <p className="text-sm text-muted">Preparing payment…</p>
          )}
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { fontFamily: '"Plus Jakarta Sans", sans-serif', borderRadius: '8px', colorPrimary: '#1C1917' }
                }
              }}
            >
              <CheckoutForm price={form.price} onSuccess={handlePaymentSuccess} />
            </Elements>
          )}
        </Card>
      )}

      {step === 6 && confirmed && <Card><h2 className="text-2xl font-black">Booking request created</h2><div className="mt-4 space-y-2 text-muted"><p><strong>Service:</strong> {confirmed.serviceType}</p><p><strong>Date:</strong> {confirmed.date} at {confirmed.time}</p><p><strong>Estimated total:</strong> £{confirmed.price}</p><StatusBadge status={confirmed.status || 'Pending'} /></div><Button className="mt-6" onClick={() => navigate('/customer/dashboard')}>Go to dashboard</Button></Card>}

      {step < 6 && (
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>Back</Button>
          {step < 5 && <Button onClick={next}>Continue</Button>}
        </div>
      )}
    </div>
  );
}
