import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import ServiceCard from '../components/ServiceCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { areas, serviceTypes } from '../data/options';

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
  postcodeArea: 'Oadby',
  cardName: '',
  cardNumber: '',
  expiry: '',
  cvc: ''
};

const subscriptionPrices = {
  '1 task/week': 28,
  '2 tasks/week': 50,
  '3 tasks/week': 66
};

export default function Book() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(blankForm);
  const [confirmed, setConfirmed] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addBooking, authUser, customers, showToast } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser) navigate('/login', { state: { from: '/book' }, replace: true });
    if (authUser && authUser.role !== 'customer') navigate('/', { replace: true });
  }, [authUser, navigate]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const validate = () => {
    const rules = {
      1: form.serviceType,
      2: form.bookingType && form.price,
      3: form.date && form.time && form.instructions.trim().length > 5,
      4: form.address.trim() && form.contactPhone.trim() && form.postcodeArea,
      5: form.cardName.trim() && form.cardNumber.trim().length >= 12 && form.expiry.trim() && form.cvc.trim().length >= 3
    };
    if (!rules[step]) {
      showToast('Please complete this step before continuing.', 'error');
      return false;
    }
    return true;
  };

  const next = () => validate() && setStep((current) => current + 1);

  const confirm = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const customer = customers.find((item) => item.id === authUser.id);
      if (!customer) {
        showToast('Customer profile is not ready. Please try again.', 'error');
        return;
      }
      const booking = {
        id: '',
        customerId: customer.id,
        runnerId: null,
        serviceType: form.serviceType,
        bookingType: form.bookingType === 'Weekly subscription' ? `Weekly subscription - ${form.subscription}` : 'One-off task',
        date: form.date,
        time: form.time,
        price: Number(form.price),
        status: 'Pending',
        rating: null,
        instructions: form.instructions,
        address: form.address,
        contactPhone: form.contactPhone,
        postcodeArea: form.postcodeArea
      };
      const saved = await addBooking(booking);
      setConfirmed(saved);
      setStep(6);
      showToast('Booking request created');
    } finally {
      setLoading(false);
    }
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

      {step === 1 && <Card><h2 className="mb-4 text-xl font-bold">Choose a service</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{serviceTypes.map((service) => <ServiceCard key={service} service={service} selected={form.serviceType === service} onClick={() => update('serviceType', service)} />)}</div></Card>}

      {step === 2 && (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">Choose booking type</h2>
          <button className={`w-full rounded-lg border p-4 text-left ${form.bookingType === 'One-off task' ? 'border-primary bg-violet-50 dark:bg-violet-900/20' : 'border-surface-hi'}`} onClick={() => setForm((current) => ({ ...current, bookingType: 'One-off task', price: 18 }))}>
            <strong>One-off task</strong><span className="block text-muted">£15-£20, selected price £18</span>
          </button>
          <button className={`w-full rounded-lg border p-4 text-left ${form.bookingType === 'Weekly subscription' ? 'border-primary bg-violet-50 dark:bg-violet-900/20' : 'border-surface-hi'}`} onClick={() => setForm((current) => ({ ...current, bookingType: 'Weekly subscription', price: subscriptionPrices[current.subscription] }))}>
            <strong>Weekly subscription</strong><span className="block text-muted">Plans from £25/week</span>
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
        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-bold"><CreditCard /> Test payment and request</h2>
          <p className="text-muted">No live payment will be taken in this MVP. This creates a booking request with a test payment record.</p>
          <div className="rounded-lg bg-surface-hi p-4"><p className="font-bold">{form.serviceType}</p><p className="text-muted">{form.date} at {form.time}</p><p className="mt-2 text-2xl font-black">£{form.price}</p></div>
          <input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" placeholder="Name on card" value={form.cardName} onChange={(e) => update('cardName', e.target.value)} />
          <input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" placeholder="4242 4242 4242 4242" value={form.cardNumber} onChange={(e) => update('cardNumber', e.target.value)} />
          <div className="grid grid-cols-2 gap-3"><input className="focus-ring min-h-11 rounded-lg border border-surface-hi px-3" placeholder="MM/YY" value={form.expiry} onChange={(e) => update('expiry', e.target.value)} /><input className="focus-ring min-h-11 rounded-lg border border-surface-hi px-3" placeholder="CVC" value={form.cvc} onChange={(e) => update('cvc', e.target.value)} /></div>
        </Card>
      )}

      {step === 6 && confirmed && <Card><h2 className="text-2xl font-black">Booking request created</h2><div className="mt-4 space-y-2 text-muted"><p><strong>Service:</strong> {confirmed.serviceType}</p><p><strong>Date:</strong> {confirmed.date} at {confirmed.time}</p><p><strong>Estimated total:</strong> £{confirmed.price}</p><StatusBadge status={confirmed.status || 'Pending'} /></div><Button className="mt-6" onClick={() => navigate('/customer/dashboard')}>Go to dashboard</Button></Card>}

      {step < 6 && (
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>Back</Button>
          {step === 5 ? <Button loading={loading} onClick={confirm}>Confirm booking</Button> : <Button onClick={next}>Continue</Button>}
        </div>
      )}
    </div>
  );
}
