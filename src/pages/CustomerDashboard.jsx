import { Elements } from '@stripe/react-stripe-js';
import { Bell, Bookmark, CalendarCheck, Clock, HeartHandshake, MessageSquare, Pencil, Plus, ShieldAlert, Star, Trash2, UserPlus, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import AccountPrivacy from '../components/AccountPrivacy';
import AvatarUpload from '../components/AvatarUpload';
import BookingCard from '../components/BookingCard';
import Button from '../components/Button';
import Card from '../components/Card';
import SubstitutionRequests from '../components/SubstitutionRequests';
import JourneyProgress from '../components/JourneyProgress';
import { GuideModal, HelpButton, hasSeenGuide } from '../components/GuideCards';
import { customerGuide } from '../data/guides';
import { BarChartHorizontal, DonutChart } from '../components/Charts';
import CheckoutForm from '../components/CheckoutForm';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { areas } from '../data/options';
import { stripePromise } from '../lib/stripe';

const tabs = ['Overview', 'My Bookings', 'Templates', 'Carers', 'Wallet', 'Messages', 'Account'];

const TOP_UP_AMOUNTS = [10, 20, 50, 100];
// Off unless explicitly enabled. Holding a customer balance is the regulated
// part of the platform, so it stays disabled until that is signed off — the
// server refuses top-up and withdrawal independently of this flag.
const WALLET_ENABLED = import.meta.env.VITE_WALLET_ENABLED === 'true';

export default function CustomerDashboard() {
  const { authUser, bookings, runners, customers, updateBooking, fetchMessages, sendMessage, updateProfile, showToast, wallet, fetchWallet, setWallet, templates, fetchTemplates, saveTemplate, removeTemplate, carerLinks, fetchCarerLinks, inviteCarer, acceptCarerInvite, removeCarerLink, enablePush, claims, fetchClaims, raiseClaim } = useApp();
  const [activeTab, setActiveTab] = useState('Overview');
  const [claimBooking, setClaimBooking] = useState(null);
  const [claimForm, setClaimForm] = useState({ category: '', description: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Any item where the runner is waiting on an answer. Fetched for live bookings
  // only, and refreshed on the existing 45s cadence — a runner standing in a shop
  // cannot wait for the customer to go looking for this.
  const [subs, setSubs] = useState([]);
  // Opens itself once per person, then only on demand from Help.
  const [showGuide, setShowGuide] = useState(() => !hasSeenGuide('customer'));

  useEffect(() => {
    const live = bookings.filter((b) => ['Assigned', 'In Progress'].includes(b.status) && b.itemCount > 0);
    if (!live.length) { setSubs([]); return; }
    let cancelled = false;
    Promise.all(live.map((b) =>
      api.bookingDetail(b.id)
        .then((d) => ({ booking: b, items: d.items || [] }))
        .catch(() => ({ booking: b, items: [] }))
    )).then((results) => {
      if (cancelled) return;
      setSubs(results.filter((r) => r.items.some((i) => i.status === 'AWAITING_APPROVAL')));
    });
    return () => { cancelled = true; };
  }, [bookings]);

  const decideSub = async (bookingId, itemId, approved) => {
    try {
      await api.decideSubstitute(bookingId, itemId, approved);
      const d = await api.bookingDetail(bookingId);
      setSubs((current) => current
        .map((r) => (r.booking.id === bookingId ? { ...r, items: d.items } : r))
        .filter((r) => r.items.some((i) => i.status === 'AWAITING_APPROVAL')));
      showToast(approved ? 'Thanks — your runner has been told' : 'Your runner will leave it off');
    } catch (err) {
      showToast(err.message || 'Could not send your answer', 'error');
    }
  };

  // Pay-now state (for PENDING_PAYMENT bookings)
  const [payNowBooking, setPayNowBooking] = useState(null);
  const [payNowSecret, setPayNowSecret] = useState(null);
  const [payNowLoading, setPayNowLoading] = useState(false);

  // Wallet state
  const [walletLoading, setWalletLoading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(20);
  const [topUpClientSecret, setTopUpClientSecret] = useState(null);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Template state
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [saveTemplateBooking, setSaveTemplateBooking] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [saveTemplateLoading, setSaveTemplateLoading] = useState(false);

  // Carer state
  const [carersLoading, setCarersLoading] = useState(false);
  const [carerEmail, setCarerEmail] = useState('');
  const [carerInviteLoading, setCarerInviteLoading] = useState(false);

  const mine = bookings.filter((b) => b.customerId === authUser.id);
  const grouped = {
    'Awaiting Payment': mine.filter((b) => b.status === 'Pending Payment'),
    Pending: mine.filter((b) => b.status === 'Pending'),
    Assigned: mine.filter((b) => b.status === 'Assigned'),
    'In Progress': mine.filter((b) => b.status === 'In Progress'),
    Completed: mine.filter((b) => b.status === 'Completed'),
    Cancelled: mine.filter((b) => b.status === 'Cancelled'),
  };
  const activeBookings = mine.filter((b) => !['Completed', 'Cancelled'].includes(b.status));
  const completedCount = grouped.Completed.length;
  const totalSpend = mine.reduce((sum, b) => sum + Number(b.price), 0);
  const subscription = mine.find((b) => b.bookingType.includes('Weekly') && b.status !== 'Completed');
  const customer = customers?.find((c) => c.id === authUser.id);

  const statusChartData = Object.entries(grouped)
    .map(([name, items]) => ({ name, value: items.length }))
    .filter((d) => d.value > 0);

  const spendByService = Object.values(
    mine.reduce((acc, b) => {
      acc[b.serviceType] = acc[b.serviceType] || { name: b.serviceType, spend: 0 };
      acc[b.serviceType].spend += Number(b.price);
      return acc;
    }, {})
  ).sort((a, b) => b.spend - a.spend);

  const messageable = mine.filter((b) => b.runnerId && ['Assigned', 'In Progress'].includes(b.status));

  const saveRating = () => {
    updateBooking(ratingBooking.id, { rating: { stars, review } });
    showToast('Rating saved');
    setRatingBooking(null);
    setReview('');
  };

  const openPayNow = async (booking) => {
    setPayNowBooking(booking);
    setPayNowLoading(true);
    try {
      const { clientSecret } = await api.resumePayment(booking.id);
      setPayNowSecret(clientSecret);
    } catch (err) {
      showToast(err.message || 'Could not load payment', 'error');
      setPayNowBooking(null);
    } finally {
      setPayNowLoading(false);
    }
  };

  const closePayNow = () => { setPayNowBooking(null); setPayNowSecret(null); };

  const openSaveTemplate = (booking) => {
    setSaveTemplateBooking(booking);
    setTemplateName(`${booking.serviceType} — ${booking.postcodeArea}`);
  };

  const submitSaveTemplate = async () => {
    setSaveTemplateLoading(true);
    try {
      await saveTemplate({
        name: templateName,
        serviceType: saveTemplateBooking.serviceType,
        bookingType: saveTemplateBooking.bookingType,
        subscription: saveTemplateBooking.subscription,
        time: saveTemplateBooking.time,
        instructions: saveTemplateBooking.instructions,
        address: saveTemplateBooking.address,
        contactPhone: saveTemplateBooking.contactPhone,
        postcodeArea: saveTemplateBooking.postcodeArea,
        price: saveTemplateBooking.price
      });
      setSaveTemplateBooking(null);
    } catch {
      // toast shown by context
    } finally {
      setSaveTemplateLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'Wallet') return;
    setWalletLoading(true);
    fetchWallet().finally(() => setWalletLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'Carers') return;
    setCarersLoading(true);
    fetchCarerLinks().finally(() => setCarersLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchClaims().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitClaim = async () => {
    if (!claimBooking || !claimForm.category || claimForm.description.trim().length < 10) {
      showToast('Please choose a reason and describe the issue (at least 10 characters).', 'error');
      return;
    }
    setClaimLoading(true);
    try {
      await raiseClaim({ bookingId: claimBooking.id, category: claimForm.category, description: claimForm.description.trim() });
      setClaimBooking(null);
      setClaimForm({ category: '', description: '' });
    } catch { /* toast shown by context */ }
    finally { setClaimLoading(false); }
  };

  useEffect(() => {
    if (activeTab !== 'Templates') return;
    setTemplatesLoading(true);
    fetchTemplates().finally(() => setTemplatesLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!contact) return;
    fetchMessages(contact.booking.id).then(setMessages).catch(() => setMessages([]));
  }, [contact]);

  const openMessages = (booking) => {
    const runner = runners.find((r) => r.id === booking.runnerId);
    setContact({ booking, runner });
  };

  const submitMessage = async () => {
    if (!messageBody.trim()) { showToast('Enter a message first.', 'error'); return; }
    setMessageLoading(true);
    try {
      await sendMessage(contact.booking.id, messageBody);
      setMessageBody('');
      setMessages(await fetchMessages(contact.booking.id));
    } finally {
      setMessageLoading(false); }
  };

  const startTopUp = async () => {
    setTopUpLoading(true);
    try {
      const { clientSecret } = await api.walletTopUp(topUpAmount);
      setTopUpClientSecret(clientSecret);
    } catch (err) {
      showToast(err.message || 'Could not initiate top-up', 'error');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleTopUpSuccess = () => {
    setTopUpClientSecret(null);
    showToast(`£${topUpAmount} added to your wallet`);
    fetchWallet();
  };

  const submitWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    setWithdrawLoading(true);
    try {
      const { newBalance } = await api.walletWithdraw(amount);
      setWallet((prev) => ({ ...prev, balance: newBalance }));
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      showToast(`Withdrawal of £${amount.toFixed(2)} requested — refund within 3–5 business days`);
      fetchWallet();
    } catch (err) {
      showToast(err.message || 'Could not process withdrawal', 'error');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const renderBooking = (booking) => (
    <BookingCard
      key={booking.id}
      booking={booking}
      runner={runners.find((r) => r.id === booking.runnerId)}
      actions={(
        <>
          {booking.status === 'Pending Payment' && (
            <Button onClick={() => openPayNow(booking)}>Pay now</Button>
          )}
          {booking.runnerId && ['Assigned', 'In Progress'].includes(booking.status) && (
            <Button variant="outline" onClick={() => openMessages(booking)}><MessageSquare size={16} /> Message runner</Button>
          )}
          {['Pending Payment', 'Pending', 'Assigned'].includes(booking.status) && (
            <Button variant="danger" onClick={() => updateBooking(booking.id, { status: 'Cancelled' })}>Cancel</Button>
          )}
          {booking.status === 'Completed' && (
            booking.rating
              ? <p className="text-sm font-semibold text-secondary">⭐ {booking.rating.stars} — {booking.rating.review}</p>
              : <Button variant="outline" onClick={() => setRatingBooking(booking)}>Rate service</Button>
          )}
          {['Completed', 'Pending', 'Assigned', 'In Progress'].includes(booking.status) && (
            <Button variant="outline" onClick={() => openSaveTemplate(booking)}>
              <Bookmark size={14} /> Save as template
            </Button>
          )}
          {['Assigned', 'In Progress', 'Completed'].includes(booking.status) && (() => {
            const claim = claims.find((c) => c.bookingId === booking.id);
            if (claim) {
              return (
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${claim.status === 'Open' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : claim.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-surface-hi text-muted'}`}>
                  <ShieldAlert size={14} /> Claim {claim.status.toLowerCase()}{claim.refundAmount ? ` · £${claim.refundAmount.toFixed(2)} refunded` : ''}
                </span>
              );
            }
            return (
              <Button variant="ghost" onClick={() => { setClaimBooking(booking); setClaimForm({ category: '', description: '' }); }}>
                <ShieldAlert size={14} /> Report an issue
              </Button>
            );
          })()}
        </>
      )}
    />
  );

  return (
    <div className="space-y-6">

      {showGuide && <GuideModal guide={customerGuide} role="customer" onClose={() => setShowGuide(false)} />}

      {/* Banner */}
      <div className="flex items-start gap-4 rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Customer dashboard</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome back, {authUser.name.split(' ')[0]}.</h1>
          <p className="mt-1 text-stone-400">
            {activeBookings.length > 0
              ? `You have ${activeBookings.length} active ${activeBookings.length === 1 ? 'booking' : 'bookings'}.`
              : 'No active bookings right now.'}
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <HelpButton className="border-stone-700 text-stone-300" onClick={() => setShowGuide(true)} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex justify-center">
        <div className="flex gap-2 overflow-x-auto rounded-xl bg-surface-hi p-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-11 whitespace-nowrap rounded-lg px-4 font-semibold transition duration-150 ${
                activeTab === tab
                  ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Where the errand is up to, above the tabs — the question people
          otherwise ring up to ask. */}
      {mine.filter((b) => ['Assigned', 'In Progress'].includes(b.status) && b.journeyStage !== 'NOT_STARTED').map((b) => (
        <Card key={`journey-${b.id}`} className="mb-4">
          <p className="font-bold text-ink">{b.serviceType} · {b.date}</p>
          <div className="mt-3"><JourneyProgress booking={b} compact /></div>
        </Card>
      ))}

      {/* Shown above the tabs, on every tab: a runner is standing in a shop
          waiting for this answer, so it must not be buried behind navigation. */}
      {subs.map(({ booking, items }) => (
        <div key={booking.id} className="mb-4">
          <SubstitutionRequests
            items={items}
            bookingLabel={`${booking.serviceType} · ${booking.date}`}
            onDecide={(itemId, approved) => decideSub(booking.id, itemId, approved)}
          />
        </div>
      ))}

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-bold text-muted">Active bookings</p><p className="text-3xl font-black text-ink">{activeBookings.length}</p></div>
                <Clock className="text-primary" />
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-bold text-muted">Completed</p><p className="text-3xl font-black text-ink">{completedCount}</p></div>
                <CalendarCheck className="text-secondary" />
              </div>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-bold text-muted">Total spent</p><p className="text-3xl font-black text-ink">£{totalSpend.toFixed(0)}</p></div>
                <WalletCards className="text-primary" />
              </div>
            </Card>
          </div>

          {mine.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card><DonutChart data={statusChartData} title="Bookings by status" /></Card>
              <Card><BarChartHorizontal data={spendByService} dataKey="spend" yKey="name" title="Spend by service (£)" prefix="£" /></Card>
            </div>
          ) : (
            <Card className="border-dashed py-10 text-center">
              <p className="font-bold text-muted">No bookings yet</p>
              <p className="mt-1 text-sm text-muted">Book your first errand and your stats will appear here.</p>
              <Button as={Link} to="/book" className="mt-4"><Plus size={16} /> Book an errand</Button>
            </Card>
          )}

          {subscription && (
            <Card className="border-l-4 border-l-secondary">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">Active subscription</p>
              <p className="mt-1 font-bold text-ink">{subscription.serviceType}</p>
              <p className="text-sm text-muted">{subscription.bookingType} · £{subscription.price}/week</p>
              <StatusBadge status={subscription.status} className="mt-2" />
            </Card>
          )}
        </div>
      )}

      {/* ── My Bookings ───────────────────────────────────────────────────── */}
      {activeTab === 'My Bookings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{mine.length} total booking{mine.length !== 1 ? 's' : ''}</p>
            <Button as={Link} to="/book" variant="outline" className="text-sm"><Plus size={14} /> New booking</Button>
          </div>
          {Object.entries(grouped).map(([status, items]) => items.length > 0 && (
            <section key={status}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-lg font-bold text-ink">{status}</h2>
                <span className="rounded-full bg-surface-hi px-2.5 py-0.5 text-xs font-bold text-muted">{items.length}</span>
              </div>
              <div className="grid gap-4">{items.map(renderBooking)}</div>
            </section>
          ))}
          {mine.length === 0 && (
            <Card className="border-dashed py-10 text-center">
              <p className="font-bold text-muted">No bookings yet</p>
              <Button as={Link} to="/book" className="mt-4"><Plus size={16} /> Book an errand</Button>
            </Card>
          )}
        </div>
      )}

      {/* ── Templates ────────────────────────────────────────────────────── */}
      {activeTab === 'Templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Book any errand again in seconds using a saved template.</p>
          </div>

          {templatesLoading && <p className="text-sm text-muted">Loading…</p>}

          {!templatesLoading && templates.length === 0 && (
            <Card className="border-dashed py-10 text-center">
              <Bookmark className="mx-auto text-muted" size={32} />
              <p className="mt-3 font-bold text-muted">No saved templates yet</p>
              <p className="mt-1 text-sm text-muted">On any booking, tap <strong>Save as template</strong> to save it here for quick re-booking.</p>
            </Card>
          )}

          {!templatesLoading && templates.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink">{template.name}</p>
                      <p className="text-sm text-muted">{template.serviceType} · {template.bookingType}</p>
                    </div>
                    <button
                      onClick={() => removeTemplate(template.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-surface-hi hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="space-y-1 text-sm text-muted">
                    <p><span className="font-semibold">Time:</span> {template.time}</p>
                    <p><span className="font-semibold">Area:</span> {template.postcodeArea}</p>
                    <p><span className="font-semibold">Address:</span> {template.address}</p>
                    {template.instructions && (
                      <p className="line-clamp-2"><span className="font-semibold">Notes:</span> {template.instructions}</p>
                    )}
                  </div>
                  <Button as={Link} to={`/book?template=${template.id}`} className="w-full">
                    <Plus size={14} /> Book again · £{template.price}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Carers ───────────────────────────────────────────────────────── */}
      {activeTab === 'Carers' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Carers can book and manage errands on someone else's behalf. Invite someone to be your carer, or accept an invite to help a person you care for.
          </p>

          {/* Invite a carer */}
          <Card className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Invite a carer</h2>
            <p className="text-sm text-muted">Enter the email of an existing ErrandBuddy account. They'll be able to book on your behalf once they accept.</p>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!carerEmail.trim()) return;
                setCarerInviteLoading(true);
                try { await inviteCarer(carerEmail.trim()); setCarerEmail(''); }
                catch { /* toast shown by context */ }
                finally { setCarerInviteLoading(false); }
              }}
            >
              <input
                type="email"
                className="focus-ring min-h-11 flex-1 rounded-lg border border-surface-hi px-3 text-sm"
                placeholder="carer@example.com"
                value={carerEmail}
                onChange={(e) => setCarerEmail(e.target.value)}
              />
              <Button type="submit" loading={carerInviteLoading} disabled={!carerEmail.trim()}>
                <UserPlus size={14} /> Send invite
              </Button>
            </form>
          </Card>

          {carersLoading && <p className="text-sm text-muted">Loading…</p>}

          {/* Pending invites received (I am the carer) */}
          {!carersLoading && carerLinks.pendingInvites.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-lg font-bold text-ink">Invitations to you</h2>
              {carerLinks.pendingInvites.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-3 border-b border-surface-hi pb-3 last:border-0">
                  <div>
                    <p className="font-semibold text-ink">{link.counterpart?.name}</p>
                    <p className="text-sm text-muted">{link.counterpart?.email} · wants you as their carer</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button className="text-sm" onClick={() => acceptCarerInvite(link.id)}>Accept</Button>
                    <Button variant="outline" className="text-sm" onClick={() => removeCarerLink(link.id)}>Decline</Button>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* People I help (I am the carer, ACTIVE) */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <HeartHandshake size={18} className="text-primary" />
              <h2 className="text-lg font-bold text-ink">People you help</h2>
            </div>
            {!carersLoading && carerLinks.clients.length === 0 ? (
              <p className="text-sm text-muted">No one yet. When someone invites you as their carer and you accept, they'll appear here.</p>
            ) : (
              carerLinks.clients.map((link) => {
                const theirBookings = bookings.filter((b) => b.createdByCarerId === authUser.id && b.customerId === link.counterpart?.id);
                return (
                  <div key={link.id} className="border-b border-surface-hi pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{link.counterpart?.name}</p>
                        <p className="text-sm text-muted">{link.counterpart?.email}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button as={Link} to={`/book?onBehalfOf=${link.counterpart?.id}`} className="text-sm">
                          <Plus size={14} /> Book for {link.counterpart?.name?.split(' ')[0]}
                        </Button>
                        <button
                          onClick={() => removeCarerLink(link.id)}
                          className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-surface-hi hover:text-red-500"
                          title="Remove link"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {theirBookings.length > 0 && (
                      <p className="mt-2 text-xs text-muted">You've placed {theirBookings.length} booking{theirBookings.length === 1 ? '' : 's'} for {link.counterpart?.name?.split(' ')[0]}.</p>
                    )}
                  </div>
                );
              })
            )}
          </Card>

          {/* My carers (I am the client) */}
          <Card className="space-y-3">
            <h2 className="text-lg font-bold text-ink">Your carers</h2>
            {!carersLoading && carerLinks.carers.length === 0 ? (
              <p className="text-sm text-muted">You haven't invited anyone yet. Invite a carer above to let them book errands for you.</p>
            ) : (
              carerLinks.carers.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-3 border-b border-surface-hi pb-3 last:border-0">
                  <div>
                    <p className="font-semibold text-ink">{link.counterpart?.name}</p>
                    <p className="text-sm text-muted">{link.counterpart?.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={link.status} />
                    <button
                      onClick={() => removeCarerLink(link.id)}
                      className="rounded-lg p-2 text-muted transition hover:bg-surface-hi hover:text-red-500"
                      title="Remove carer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* ── Wallet ───────────────────────────────────────────────────────── */}
      {activeTab === 'Wallet' && (
        <div className="space-y-4">
          {/* Balance card */}
          <div className="rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Wallet balance</p>
            {walletLoading ? (
              <p className="mt-2 text-sm text-stone-400">Loading…</p>
            ) : (
              <p className="mt-1 text-4xl font-black">£{wallet.balance.toFixed(2)}</p>
            )}
            {wallet.balance < 0 && (
              <p className="mt-2 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-300">
                Negative balance — new bookings are paused until this is cleared.
              </p>
            )}
          </div>

          {/* Top-up — disabled for the pilot. The wallet holds customer money,
              which is the part of the platform that needs professional sign-off
              before it can take real funds, so top-ups are switched off while
              cost-of-goods is settled directly between customer and runner. */}
          {!WALLET_ENABLED && (
            <Card className="space-y-2 border-dashed">
              <h2 className="text-lg font-bold text-ink">Top up wallet</h2>
              <p className="text-sm text-muted">
                Wallet top-ups are switched off for now. During the pilot you settle the cost of
                your shopping with your runner directly — everything else works as normal.
              </p>
              <p className="text-sm font-semibold text-muted">We'll turn this back on shortly.</p>
            </Card>
          )}

          {WALLET_ENABLED && (
          <Card className="space-y-4">
            <h2 className="text-lg font-bold text-ink">Top up wallet</h2>
            <p className="text-sm text-muted">Add funds to cover the cost of goods your runner purchases on your behalf.</p>

            {!topUpClientSecret ? (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {TOP_UP_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopUpAmount(amt)}
                      className={`rounded-lg border py-3 text-sm font-bold transition ${topUpAmount === amt ? 'border-stone-900 bg-stone-50 dark:border-zinc-400 dark:bg-zinc-900' : 'border-surface-hi text-muted hover:border-stone-400'}`}
                    >
                      £{amt}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="focus-ring min-h-10 w-28 rounded-lg border border-surface-hi px-3 text-sm"
                    placeholder="£ amount"
                    value={TOP_UP_AMOUNTS.includes(topUpAmount) ? '' : topUpAmount}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  />
                </div>
                <Button loading={topUpLoading} onClick={startTopUp} className="w-full">
                  Top up £{topUpAmount}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-surface-hi p-3 text-sm font-semibold text-ink">
                  Adding £{topUpAmount} to your wallet
                </div>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: topUpClientSecret,
                    appearance: { theme: 'stripe', variables: { fontFamily: '"Plus Jakarta Sans", sans-serif', borderRadius: '8px', colorPrimary: '#1C1917' } }
                  }}
                >
                  <CheckoutForm price={topUpAmount} onSuccess={handleTopUpSuccess} />
                </Elements>
                <button className="text-sm text-muted underline" onClick={() => setTopUpClientSecret(null)}>Cancel</button>
              </div>
            )}
          </Card>
          )}

          {/* Withdraw */}
          {WALLET_ENABLED && wallet.balance > 0 && (
            <Card className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-ink">Withdraw funds</p>
                <p className="text-sm text-muted">Refunded to your original payment method within 3–5 business days.</p>
              </div>
              <Button variant="outline" className="flex-shrink-0" onClick={() => setShowWithdrawModal(true)}>Withdraw</Button>
            </Card>
          )}

          {/* Transaction history */}
          <Card>
            <h2 className="mb-4 text-lg font-bold text-ink">Transaction history</h2>
            {wallet.transactions.length === 0 ? (
              <p className="text-sm text-muted">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {wallet.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-surface-hi pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-semibold capitalize text-ink">{tx.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted">{tx.description} · {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span className={`text-sm font-bold ${['deposit', 'reimbursement'].includes(tx.type) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {['deposit', 'reimbursement'].includes(tx.type) ? '+' : '−'}£{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      {activeTab === 'Messages' && (
        <div className="space-y-4">
          {messageable.length > 0 ? messageable.map((booking) => {
            const runner = runners.find((r) => r.id === booking.runnerId);
            return (
              <Card key={booking.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-ink">{booking.serviceType}</p>
                  <p className="text-sm text-muted">{runner?.name || 'Runner'} · <StatusBadge status={booking.status} /></p>
                  <p className="text-sm text-muted">{booking.date} at {booking.time}</p>
                </div>
                <Button variant="outline" className="flex-shrink-0" onClick={() => openMessages(booking)}>
                  <MessageSquare size={16} /> Message
                </Button>
              </Card>
            );
          }) : (
            <Card className="border-dashed py-10 text-center">
              <MessageSquare className="mx-auto text-muted" size={32} />
              <p className="mt-3 font-bold text-muted">No active conversations</p>
              <p className="mt-1 text-sm text-muted">Messages become available once a runner is assigned to your booking.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Account ───────────────────────────────────────────────────────── */}
      {activeTab === 'Account' && (
        <div className="space-y-4">
          <AvatarUpload profile={customer} />
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Personal details</h2>
              {!editing && (
                <Button variant="ghost" className="text-sm" onClick={() => {
                  setProfileForm({ name: authUser.name, email: authUser.email, phone: customer?.phone || '', address: customer?.address || '', postcodeArea: customer?.postcodeArea || 'Oadby' });
                  setEditing(true);
                }}>
                  <Pencil size={14} /> Edit
                </Button>
              )}
            </div>

            {editing && profileForm ? (
              <form className="mt-4 space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                setProfileSaving(true);
                try { await updateProfile(profileForm); setEditing(false); }
                finally { setProfileSaving(false); }
              }}>
                {[
                  { label: 'Name', field: 'name', type: 'text' },
                  { label: 'Email', field: 'email', type: 'email' },
                  { label: 'Phone', field: 'phone', type: 'tel' },
                  { label: 'Address', field: 'address', type: 'text' },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs font-bold text-muted">{label}</label>
                    <input
                      type={type}
                      className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm"
                      value={profileForm[field]}
                      onChange={(e) => setProfileForm((f) => ({ ...f, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Area</label>
                  <select className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm" value={profileForm.postcodeArea} onChange={(e) => setProfileForm((f) => ({ ...f, postcodeArea: e.target.value }))}>
                    {areas.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={profileSaving} className="flex-1">Save changes</Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                {[['Name', authUser.name], ['Email', authUser.email], ['Phone', customer?.phone], ['Address', customer?.address], ['Area', customer?.postcodeArea]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-surface-hi pb-3 last:border-0">
                    <span className="text-muted">{label}</span>
                    <span className="font-semibold text-ink">{value || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Notifications</h2>
                <p className="mt-1 text-sm text-muted">Get instant alerts on this device for booking updates, carer activity and charges.</p>
              </div>
              <Button variant="outline" className="shrink-0 text-sm" onClick={enablePush}>
                <Bell size={14} /> Enable
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-ink">Activity summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              {[['Total bookings', mine.length], ['Completed', completedCount], ['Total spent', `£${totalSpend.toFixed(2)}`]].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-surface-hi pb-3 last:border-0">
                  <span className="text-muted">{label}</span>
                  <span className="font-semibold text-ink">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <AccountPrivacy />
        </div>
      )}

      {/* ── Report an issue (claim) modal ────────────────────────────────── */}
      {claimBooking && (
        <Modal title="Report an issue" onClose={() => setClaimBooking(null)}>
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-hi p-3 text-sm">
              <p className="font-bold text-ink">{claimBooking.serviceType}</p>
              <p className="text-muted">{claimBooking.date} at {claimBooking.time} · £{claimBooking.price}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">What went wrong?</label>
              <div className="flex flex-wrap gap-2">
                {['Item damaged or wrong', 'Task not completed', 'Runner conduct', 'Overcharged', 'Other'].map((c) => (
                  <button key={c} type="button" onClick={() => setClaimForm((f) => ({ ...f, category: c }))}
                    className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition ${claimForm.category === c ? 'border-stone-900 bg-stone-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-surface-hi text-muted hover:border-stone-400 hover:text-ink'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">Tell us what happened</label>
              <textarea className="focus-ring min-h-28 w-full rounded-lg border border-surface-hi p-3 text-sm" placeholder="Describe the issue so we can put it right…" value={claimForm.description} onChange={(e) => setClaimForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <Button className="w-full" loading={claimLoading} disabled={!claimForm.category || claimForm.description.trim().length < 10} onClick={submitClaim}>
              Submit claim
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Save template modal ──────────────────────────────────────────── */}
      {saveTemplateBooking && (
        <Modal title="Save as template" onClose={() => setSaveTemplateBooking(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Give this template a name so you can find it easily.</p>
            <input
              type="text"
              className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3"
              placeholder="e.g. Weekly Tesco run"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              autoFocus
            />
            <Button className="w-full" loading={saveTemplateLoading} disabled={!templateName.trim()} onClick={submitSaveTemplate}>
              Save template
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Pay now modal ────────────────────────────────────────────────── */}
      {payNowBooking && (
        <Modal title="Complete payment" onClose={closePayNow}>
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-hi p-4">
              <p className="font-bold text-ink">{payNowBooking.serviceType}</p>
              <p className="text-sm text-muted">{payNowBooking.date} at {payNowBooking.time}</p>
              <p className="mt-1 text-2xl font-black text-ink">£{payNowBooking.price}</p>
            </div>
            {payNowLoading && <p className="text-sm text-muted">Loading payment…</p>}
            {payNowSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: payNowSecret,
                  appearance: { theme: 'stripe', variables: { fontFamily: '"Plus Jakarta Sans", sans-serif', borderRadius: '8px', colorPrimary: '#1C1917' } }
                }}
              >
                <CheckoutForm
                  price={payNowBooking.price}
                  onSuccess={() => {
                    showToast('Payment confirmed!');
                    closePayNow();
                  }}
                />
              </Elements>
            )}
          </div>
        </Modal>
      )}

      {/* ── Withdraw modal ───────────────────────────────────────────────── */}
      {showWithdrawModal && (
        <Modal title="Withdraw funds" onClose={() => { setShowWithdrawModal(false); setWithdrawAmount(''); }}>
          <div className="space-y-4">
            <p className="text-sm text-muted">Available: <strong className="text-ink">£{wallet.balance.toFixed(2)}</strong></p>
            <input
              type="number"
              min="0.01"
              max={wallet.balance}
              step="0.01"
              className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3"
              placeholder="Amount to withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <Button className="w-full" loading={withdrawLoading} onClick={submitWithdraw}>Confirm withdrawal</Button>
          </div>
        </Modal>
      )}

      {/* ── Rating modal ─────────────────────────────────────────────────── */}
      {ratingBooking && (
        <Modal title="Rate this service" onClose={() => setRatingBooking(null)}>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} className="p-1 text-amber-400" onClick={() => setStars(v)}>
                  <Star fill={v <= stars ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <textarea className="focus-ring min-h-28 w-full rounded-lg border border-surface-hi p-3" placeholder="Write a review..." value={review} onChange={(e) => setReview(e.target.value)} />
            <Button onClick={saveRating} className="w-full">Save rating</Button>
          </div>
        </Modal>
      )}

      {/* ── Message modal ─────────────────────────────────────────────────── */}
      {contact && (
        <Modal
          title={`${contact.booking.serviceType} · ${contact.runner?.name || 'Runner'}`}
          onClose={() => { setContact(null); setMessages([]); setMessageBody(''); }}
        >
          <div className="space-y-3">
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-surface-hi p-3 text-sm">
              {messages.length ? messages.map((msg) => {
                const fromMe = msg.senderId === authUser.userId;
                return (
                  <div key={msg.id} className={`rounded-lg p-3 ${fromMe ? 'ml-8 bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'mr-8 bg-surface text-ink'}`}>
                    <p className="font-bold">{fromMe ? 'You' : msg.senderName}</p>
                    <p>{msg.body}</p>
                  </div>
                );
              }) : <p className="text-muted">No messages yet. Say hello!</p>}
            </div>
            <textarea className="focus-ring min-h-24 w-full rounded-lg border border-surface-hi p-3" placeholder="Type a message..." value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
            <Button className="w-full" loading={messageLoading} disabled={!messageBody.trim()} onClick={submitMessage}>Send</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
