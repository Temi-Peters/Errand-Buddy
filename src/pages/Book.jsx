import { Elements } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import CheckoutForm from '../components/CheckoutForm';
import ServiceCard from '../components/ServiceCard';
import ShoppingList from '../components/ShoppingList';
import PhotoUpload from '../components/PhotoUpload';
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
  items: [],
  pendingPhotos: [],
  goodsBudget: '',
  substitutionPreference: 'ASK_ME_FIRST',
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
  const { authUser, customers, showToast, wallet, fetchWallet, fetchCarerLinks } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onBehalfOf = searchParams.get('onBehalfOf') || null;
  const [client, setClient] = useState(null);

  // Address and phone were captured at signup and then ignored here, so people
  // retyped them on every booking — real friction for older users. Prefill from
  // the profile, but leave the fields editable: an errand often goes somewhere
  // other than home. Only fills blanks, so a template or a part-filled form wins.
  useEffect(() => {
    if (onBehalfOf) return; // a carer's own address is not where the errand goes
    const profile = customers.find((item) => item.id === authUser?.id);
    if (!profile) return;

    setForm((current) => ({
      ...current,
      address: current.address || profile.address || '',
      contactPhone: current.contactPhone || profile.phone || '',
      postcodeArea: current.postcodeArea === blankForm.postcodeArea
        ? (profile.postcodeArea || current.postcodeArea)
        : current.postcodeArea
    }));
  }, [authUser, customers, onBehalfOf]);

  // When booking on behalf of a client, resolve the client from the carer's active links.
  // If no active link is found, the carer isn't authorised — bounce them back.
  useEffect(() => {
    if (!onBehalfOf || !authUser) return;
    fetchCarerLinks()
      .then(({ clients }) => {
        const match = (clients || []).find((link) => link.counterpart?.id === onBehalfOf);
        if (!match) {
          showToast('You are not an active carer for this person.', 'error');
          navigate('/customer/dashboard', { replace: true });
          return;
        }
        setClient(match.counterpart);
      })
      .catch(() => {});
  }, [onBehalfOf, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Spread the blank form first: templates predate the budget and
        // substitution fields, so replacing the object wholesale would leave
        // them undefined and send an empty preference to the server.
        setForm({
          ...blankForm,
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
      goodsBudget: form.goodsBudget === '' ? undefined : Number(form.goodsBudget),
      substitutionPreference: form.substitutionPreference,
      address: form.address,
      contactPhone: form.contactPhone,
      postcodeArea: form.postcodeArea,
      ...(onBehalfOf ? { onBehalfOf } : {})
    })
      .then(async ({ booking, clientSecret: secret }) => {
        // Items and photos attach to a booking that now exists, so they're saved
        // straight after creation. Best-effort: a failure here must not block
        // payment for an errand the customer has already described in the notes.
        try {
          const realItems = form.items.filter((item) => item.name.trim());
          if (realItems.length) await api.saveBookingItems(booking.id, realItems);
          for (const photo of form.pendingPhotos) {
            await api.addBookingPhoto(booking.id, { kind: 'REQUEST', dataUrl: photo.dataUrl });
          }
        } catch {
          showToast('Your booking is saved, but a photo or list item did not attach.', 'error');
        }
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

      {client && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-ink">Booking on behalf of {client.name}</p>
          <p className="mt-1 text-sm text-muted">This errand will be added to {client.name}'s account. You'll pay the service fee with your own card, and you'll both be able to see and manage it.</p>
        </div>
      )}

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

      {step === 3 && (
        <Card className="space-y-5">
          <h2 className="text-xl font-bold">Schedule and details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-muted">Date</span>
              <input className="focus-ring mt-1 min-h-11 w-full rounded-lg border border-surface-hi px-3" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-muted">Time</span>
              <input className="focus-ring mt-1 min-h-11 w-full rounded-lg border border-surface-hi px-3" type="time" value={form.time} onChange={(e) => update('time', e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-muted">What do you need?</span>
            <textarea
              className="focus-ring mt-1 min-h-32 w-full rounded-lg border border-surface-hi p-3"
              placeholder={'List everything you need, one per line. For example:\n2 pints semi-skimmed milk\nHovis wholemeal loaf\n6 free-range eggs'}
              value={form.instructions}
              onChange={(e) => update('instructions', e.target.value)}
            />
          </label>

          {/* Spend cap. The runner cannot charge past this without recording a
              reason, and anything above it is held for approval rather than taken. */}
          <label className="block">
            <span className="text-sm font-bold text-muted">Roughly what should the shopping cost?</span>
            <p className="mt-1 text-sm text-muted">
              Your spending limit — separate from the service fee. <strong className="text-ink">You'll never be charged more than this
              without being asked first.</strong> Leave blank if there's nothing to buy.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-muted">£</span>
              <input
                className="focus-ring min-h-11 w-32 rounded-lg border border-surface-hi px-3"
                type="number" min="0" max="1000" step="1" placeholder="40"
                value={form.goodsBudget}
                onChange={(e) => update('goodsBudget', e.target.value)}
              />
            </div>
          </label>

          <ShoppingList items={form.items} onChange={(items) => update('items', items)} />

          <PhotoUpload
            kind="REQUEST"
            label="Photos of what you need (optional)"
            hint="A picture of the exact product saves any guesswork — especially for a specific brand or size."
            photos={form.pendingPhotos}
            onAdd={({ dataUrl }) => update('pendingPhotos', [...form.pendingPhotos, { id: `tmp-${form.pendingPhotos.length}-${dataUrl.length}`, kind: 'REQUEST', dataUrl }])}
            onRemove={(id) => update('pendingPhotos', form.pendingPhotos.filter((p) => p.id !== id))}
          />

          <fieldset>
            <legend className="text-sm font-bold text-muted">If something's out of stock</legend>
            <div className="mt-2 grid gap-2">
              {[
                { value: 'ASK_ME_FIRST', label: 'Ask me first', hint: 'Your runner will call before buying anything different' },
                { value: 'SUBSTITUTE_FREELY', label: 'Pick something similar', hint: 'Trust your runner to choose a sensible alternative' },
                { value: 'NO_SUBSTITUTES', label: 'Just skip it', hint: 'Leave it off rather than swapping it' }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${form.substitutionPreference === option.value ? 'border-stone-900 bg-stone-50 dark:border-zinc-400 dark:bg-zinc-900' : 'border-surface-hi'}`}
                >
                  <input
                    type="radio" name="substitutionPreference" className="mt-1"
                    checked={form.substitutionPreference === option.value}
                    onChange={() => update('substitutionPreference', option.value)}
                  />
                  <span>
                    <span className="block font-semibold text-ink">{option.label}</span>
                    <span className="block text-sm text-muted">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
      )}

      {step === 4 && <Card className="space-y-4"><h2 className="text-xl font-bold">Location and contact</h2><input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" placeholder="Address" value={form.address} onChange={(e) => update('address', e.target.value)} /><input className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" placeholder="Contact phone" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} /><select className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3" value={form.postcodeArea} onChange={(e) => update('postcodeArea', e.target.value)}>{areas.map((area) => <option key={area}>{area}</option>)}</select></Card>}

      {step === 5 && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">Payment</h2>
            {/* Once the booking exists the server has told us the real price —
                prefer it over the local estimate, which knows nothing about
                introductory offers. */}
            <div className="mt-3 rounded-xl bg-surface-hi p-4">
              <p className="font-bold">{form.serviceType}</p>
              <p className="text-sm text-muted">{form.date} at {form.time}</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <p className="text-2xl font-black">£{Number(confirmed?.price ?? form.price).toFixed(2)}</p>
                {confirmed?.discountAmount > 0 && (
                  <p className="text-lg font-semibold text-muted line-through">£{Number(confirmed.listPrice).toFixed(2)}</p>
                )}
              </div>
              {confirmed?.discountAmount > 0 && (
                <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    🎉 First errand offer — £{Number(confirmed.discountAmount).toFixed(2)} off
                  </p>
                  <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    A one-time welcome price for your first errand. Later errands are £{Number(confirmed.listPrice).toFixed(2)}.
                  </p>
                </div>
              )}
            </div>
          </div>
          {onBehalfOf ? (
            <div className="rounded-xl border border-surface-hi bg-surface-hi p-3 text-sm text-muted">
              You're paying the service fee for <span className="font-semibold text-ink">{client?.name}</span> with your card. The cost of any goods is covered by their wallet.
            </div>
          ) : (
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
          )}

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
              <CheckoutForm price={Number(confirmed?.price ?? form.price)} onSuccess={handlePaymentSuccess} />
            </Elements>
          )}
        </Card>
      )}

      {step === 6 && confirmed && <Card><h2 className="text-2xl font-black">Booking request created</h2><div className="mt-4 space-y-2 text-muted"><p><strong>Service:</strong> {confirmed.serviceType}</p><p><strong>Date:</strong> {confirmed.date} at {confirmed.time}</p><p><strong>Estimated total:</strong> £{Number(confirmed.price).toFixed(2)}</p>{confirmed.discountAmount > 0 && <p className="font-semibold text-emerald-700 dark:text-emerald-400">First errand offer applied — £{Number(confirmed.discountAmount).toFixed(2)} off. This is a one-time welcome price; later errands are £{Number(confirmed.listPrice).toFixed(2)}.</p>}<StatusBadge status={confirmed.status || 'Pending'} /></div><Button className="mt-6" onClick={() => navigate('/customer/dashboard')}>Go to dashboard</Button></Card>}

      {step < 6 && (
        <div className="mt-6 flex justify-between gap-3">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>Back</Button>
          {step < 5 && <Button onClick={next}>Continue</Button>}
        </div>
      )}
    </div>
  );
}
