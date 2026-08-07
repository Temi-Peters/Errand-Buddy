import { Bell, CheckCircle2, ClipboardList, ExternalLink, MessageSquare, Pencil, ShieldCheck, Star, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import BookingCard from '../components/BookingCard';
import Button from '../components/Button';
import Card from '../components/Card';
import AccountPrivacy from '../components/AccountPrivacy';
import RunnerVerification from '../components/RunnerVerification';
import Avatar from '../components/Avatar';
import AvatarUpload from '../components/AvatarUpload';
import VerifiedBadge, { RunnerRating } from '../components/VerifiedBadge';
import PhotoUpload from '../components/PhotoUpload';
import { GuideModal, HelpButton, hasSeenGuide } from '../components/GuideCards';
import { runnerGuide } from '../data/guides';
import { BarChartHorizontal, BarChartVertical } from '../components/Charts';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { areas } from '../data/options';

const tabs = ['Available Tasks', 'My Tasks', 'Earnings', 'Messages', 'Profile'];
// Prefer the figure the server actually recorded. Recomputing from the booking
// price is wrong on a discounted booking — the runner is paid on the full tariff
// while the customer paid an introductory price, so price * 0.9 would understate
// what they are owed. The multiplier is only a fallback for older bookings.
const payout = (booking) => (
  booking?.payment?.runnerPayoutAmount != null
    ? Number(booking.payment.runnerPayoutAmount)
    : Math.round(Number(booking?.price || 0) * 0.9 * 100) / 100
);
// Always two decimals — a £15 job was showing "£13.5", which reads as a bug.
const money = (value) => Number(value || 0).toFixed(2);
// Works on both iOS and Android without needing to detect the platform.
const mapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
// Soonest first — a runner works forwards through the day, and the server hands
// bookings back newest-first, which put today's job at the bottom of the list.
const bySoonest = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

// What to do when something isn't on the shelf. Shown wherever a runner might be
// about to make that decision — the alternative is guessing on someone else's
// shopping, which is the main way a grocery errand goes wrong.
const SUBSTITUTION = {
  ASK_ME_FIRST: { label: 'Call me before swapping anything', tone: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200' },
  SUBSTITUTE_FREELY: { label: 'Happy for you to pick something similar', tone: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200' },
  NO_SUBSTITUTES: { label: 'Skip it — do not substitute', tone: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200' }
};

function ShoppingRules({ booking, className = '' }) {
  const rule = SUBSTITUTION[booking.substitutionPreference] || SUBSTITUTION.ASK_ME_FIRST;
  return (
    <div className={`w-full space-y-2 ${className}`}>
      {booking.goodsBudget != null && (
        <p className="text-sm">
          <strong>Spend up to £{money(booking.goodsBudget)}</strong>
          <span className="text-muted"> on the shopping. Going over needs a reason, and the customer isn't charged the extra.</span>
        </p>
      )}
      <span className={`inline-block rounded-lg px-2.5 py-1 text-sm font-semibold ${rule.tone}`}>
        {rule.label}
      </span>
    </div>
  );
}

export default function RunnerDashboard() {
  const { authUser, runners, customers, bookings, updateBooking, acceptBooking, completeRunnerTask, fetchMessages, sendMessage, updateProfile, showToast, enablePush } = useApp();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [goodsCost, setGoodsCost] = useState('');
  const [overageReason, setOverageReason] = useState('');
  const [detail, setDetail] = useState({ items: [], photos: [] });
  const [showGuide, setShowGuide] = useState(() => !hasSeenGuide('runner'));
  const [asking, setAsking] = useState(null); // item we're proposing a swap for
  const [askName, setAskName] = useState('');
  const [askPhoto, setAskPhoto] = useState(null);
  const [askBusy, setAskBusy] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const runner = runners.find((item) => item.id === authUser.id);

  const submitComplete = async () => {
    if (!completingBooking) return;
    setCompleteLoading(true);
    try {
      await completeRunnerTask(completingBooking.id, runner.id, Number(goodsCost) || 0, overageReason.trim());
      setCompletingBooking(null);
      setGoodsCost('');
      setOverageReason('');
    } catch {
      /* toast shown by context */
    } finally {
      setCompleteLoading(false);
    }
  };

  // Live overage against the customer's agreed budget, so the runner sees the
  // problem while typing rather than after submitting.
  const budget = completingBooking?.goodsBudget ?? null;
  const overage = budget == null ? 0 : Math.max(0, (Number(goodsCost) || 0) - budget);

  useEffect(() => {
    if (activeTab !== 'Profile' || connectStatus !== null) return;
    api.runnerConnectStatus()
      .then(setConnectStatus)
      .catch(() => {}); // non-critical
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectOnboard = async () => {
    setConnectLoading(true);
    try {
      const { url } = await api.runnerConnectLink();
      window.location.href = url;
    } catch (err) {
      showToast(err.message || 'Could not start payout setup. Try again.', 'error');
    } finally {
      setConnectLoading(false);
    }
  };

  // Items and photos live outside the polled booking list, so they're fetched
  // when the runner actually opens the completion modal.
  useEffect(() => {
    if (!completingBooking) { setDetail({ items: [], photos: [] }); return; }
    api.bookingDetail(completingBooking.id)
      .then(setDetail)
      .catch(() => setDetail({ items: [], photos: [] }));
  }, [completingBooking]);

  const setItemStatus = async (itemId, status, substitutedWith = '') => {
    try {
      const { item } = await api.updateBookingItem(completingBooking.id, itemId, { status, substitutedWith });
      setDetail((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? item : i)) }));
    } catch (err) {
      showToast(err.message || 'Could not update that item', 'error');
    }
  };

  const sendProposal = async () => {
    if (!askName.trim()) { showToast('Say what you would get instead', 'error'); return; }
    setAskBusy(true);
    try {
      const { item } = await api.proposeSubstitute(completingBooking.id, asking.id, {
        name: askName.trim(), dataUrl: askPhoto || undefined
      });
      setDetail((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? item : i)) }));
      setAsking(null); setAskName(''); setAskPhoto(null);
      showToast('Sent — your customer has been notified');
    } catch (err) {
      showToast(err.message || 'Could not send that', 'error');
    } finally {
      setAskBusy(false);
    }
  };

  const addReceipt = async ({ dataUrl }) => {
    const { photo } = await api.addBookingPhoto(completingBooking.id, { kind: 'RECEIPT', dataUrl });
    setDetail((d) => ({ ...d, photos: [...d.photos, photo] }));
  };

  useEffect(() => {
    if (!contact) return;

    fetchMessages(contact.booking.id)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [contact]);

  if (!runner) return <Card className="text-center"><p className="font-bold text-muted">Runner profile is loading.</p></Card>;
  if (runner.status === 'Pending') return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <ClipboardList className="mx-auto text-primary" size={42} />
        <h1 className="mt-4 text-3xl font-black text-ink">Almost there, {runner.name.split(' ')[0]}.</h1>
        <p className="mt-2 text-muted">One last step — verify your identity below so our team can approve you as a runner.</p>
      </div>
      <RunnerVerification />
      <AvatarUpload profile={runner} />
    </div>
  );
  if (runner.status === 'Rejected') return <Card className="mx-auto max-w-2xl p-8 text-center"><h1 className="text-3xl font-black">Application not approved</h1><p className="mt-3 text-muted">{runner.rejectionReason || 'Your application was not approved. Contact support if you have questions.'}</p></Card>;
  if (runner.status === 'Suspended') return <Card className="mx-auto max-w-2xl p-8 text-center"><h1 className="text-3xl font-black">Runner account suspended</h1><p className="mt-3 text-muted">Your runner account is currently suspended. Please contact support for help.</p></Card>;

  const available = bookings.filter((booking) => booking.status === 'Pending' && !booking.runnerId && booking.postcodeArea === runner.area);
  const myTasks = bookings.filter((booking) => booking.runnerId === runner.id);
  const groupedTasks = {
    Assigned: myTasks.filter((booking) => booking.status === 'Assigned').sort(bySoonest),
    'In Progress': myTasks.filter((booking) => booking.status === 'In Progress').sort(bySoonest),
    // Completed stays newest-first — that's a history, not a to-do list.
    Completed: myTasks.filter((booking) => booking.status === 'Completed')
  };
  const completed = bookings.filter((booking) => booking.runnerId === runner.id && booking.status === 'Completed');
  const earnings = completed.reduce((sum, booking) => sum + payout(booking), 0);
  const ratings = completed.map((booking) => booking.rating?.stars).filter(Boolean);

  // Chart data
  const earningsByMonth = Object.values(
    completed.reduce((acc, booking) => {
      const month = new Date(booking.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      acc[month] = acc[month] || { month, earnings: 0 };
      acc[month].earnings += payout(booking);
      return acc;
    }, {})
  );

  const tasksByService = Object.values(
    myTasks.reduce((acc, booking) => {
      acc[booking.serviceType] = acc[booking.serviceType] || { name: booking.serviceType, tasks: 0 };
      acc[booking.serviceType].tasks += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.tasks - a.tasks);

  // Accepting is a one-way commitment — there is no release action — so a mis-tap
  // on a phone would bind a runner to a job they can't hand back. Confirm first.
  const accept = async (booking) => {
    const when = `${booking.date} at ${booking.time}`;
    if (!window.confirm(`Accept this ${booking.serviceType.toLowerCase()} on ${when}?\n\nYou'll be committing to this task and the customer will be told you're on it.`)) return;
    await acceptBooking(booking.id);
    showToast('Task accepted');
  };

  const submitMessage = async () => {
    if (!messageBody.trim()) {
      showToast('Enter a message first.', 'error');
      return;
    }

    setMessageLoading(true);
    try {
      await sendMessage(contact.booking.id, messageBody);
      setMessageBody('');
      setMessages(await fetchMessages(contact.booking.id));
    } finally {
      setMessageLoading(false);
    }
  };

  const renderTask = (booking) => {
    const customer = customers.find((item) => item.id === booking.customerId);
    return (
      <BookingCard
        key={booking.id}
        booking={booking}
        customer={customer}
        actions={(
          <>
            <div className="w-full text-sm text-muted">
              {booking.address
                ? (
                  <>
                    {/* Tappable — the runner is on a phone, often walking. */}
                    <p>
                      <strong>Address:</strong>{' '}
                      <a className="font-semibold text-ink underline" href={mapsUrl(booking.address)} target="_blank" rel="noreferrer">{booking.address}</a>
                    </p>
                    <p>
                      <strong>Phone:</strong>{' '}
                      <a className="font-semibold text-ink underline" href={`tel:${booking.contactPhone}`}>{booking.contactPhone}</a>
                    </p>
                  </>
                )
                : <p><strong>Area:</strong> {booking.postcodeArea} · full address and contact details are shared once you accept this task</p>}
              <p><strong>Instructions:</strong> {booking.instructions}</p>
            </div>
            <ShoppingRules booking={booking} />
            {booking.status === 'Assigned' && <Button onClick={() => updateBooking(booking.id, { status: 'In Progress' })}>Start Task</Button>}
            {booking.status === 'In Progress' && <Button variant="secondary" onClick={() => { setCompletingBooking(booking); setGoodsCost(''); }}>Mark Complete</Button>}
            {/* Was gated to In Progress only, while the Messages tab listed Assigned
                conversations too — so an accepted-but-not-started job had no way to
                message from here. Both now agree. */}
            {['Assigned', 'In Progress'].includes(booking.status) && <Button variant="outline" onClick={() => setContact({ booking, customer })}><MessageSquare size={18} /> Contact Customer</Button>}
            {booking.status === 'Completed' && <p className="font-semibold text-secondary">Completed</p>}
          </>
        )}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900">
        <Avatar url={runner.avatarUrl} name={runner.name} size={64} className="ring-2 ring-white/20" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Runner dashboard</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{runner.name}</h1>
            {runner.verified && <VerifiedBadge />}
          </div>
          <p className="mt-1 text-stone-400">{runner.area} · {runner.status === 'Active' ? 'Active runner' : `${runner.status} runner`}</p>
        </div>
        <div className="ml-auto">
          <HelpButton className="border-stone-700 text-stone-300" onClick={() => setShowGuide(true)} />
        </div>
      </div>
      {showGuide && <GuideModal guide={runnerGuide} role="runner" onClose={() => setShowGuide(false)} />}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Card><ClipboardList className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Available nearby</p><p className="text-3xl font-black">{available.length}</p></Card><Card><CheckCircle2 className="text-secondary" /><p className="mt-3 text-sm font-bold text-muted">Completed</p><p className="text-3xl font-black">{completed.length}</p></Card><Card><WalletCards className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Earnings</p><p className="text-3xl font-black">£{earnings.toFixed(0)}</p></Card><Card><Star className="text-amber-500" /><p className="mt-3 text-sm font-bold text-muted">Rating</p><div className="mt-1"><RunnerRating runner={runner} /></div></Card></div>
      <div className="flex justify-center">
        <div className="flex gap-2 overflow-x-auto rounded-xl bg-surface-hi p-2">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`min-h-11 whitespace-nowrap rounded-lg px-4 font-semibold transition duration-150 ${activeTab === tab ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-muted hover:bg-surface hover:text-ink'}`}>{tab}</button>
          ))}
        </div>
      </div>
      {activeTab === 'Available Tasks' && <div className="grid gap-4">{available.length ? [...available].sort(bySoonest).map((booking) => <BookingCard key={booking.id} booking={booking} actions={(
        <>
          <p className="font-bold text-secondary">Runner payout: £{money(payout(booking))}</p>
          {/* What the customer actually wants. The server already sends this to
              browsing runners; it just was not being shown, so people were
              committing to a shop with no idea what was on the list. */}
          <div className="w-full rounded-lg bg-surface-hi p-3 text-sm">
            <p className="font-bold text-ink">What's needed</p>
            <p className="mt-1 whitespace-pre-line text-muted">{booking.instructions || 'No details given.'}</p>
          </div>
          <ShoppingRules booking={booking} />
          <p className="text-sm text-muted">{booking.postcodeArea} · full address shared once you accept</p>
          <Button onClick={() => accept(booking)}>Accept Task</Button>
        </>
      )} />) : <Card className="border-dashed text-center"><p className="font-bold text-muted">No open tasks in your area</p><p className="mt-1 text-sm text-muted">Check back later for new local errands.</p></Card>}</div>}
      {activeTab === 'My Tasks' && <div className="space-y-6">{Object.entries(groupedTasks).map(([status, items]) => <section key={status}><h2 className="mb-3 text-xl font-bold">{status}</h2><div className="grid gap-4">{items.length ? items.map(renderTask) : <Card><p className="text-muted">No {status.toLowerCase()} tasks.</p></Card>}</div></section>)}</div>}
      {activeTab === 'Earnings' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><p className="text-sm font-bold text-muted">Total earned</p><p className="text-3xl font-black">£{earnings.toFixed(2)}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Completed tasks</p><p className="text-3xl font-black">{completed.length}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Avg per task</p><p className="text-3xl font-black">£{completed.length ? (earnings / completed.length).toFixed(2) : '0.00'}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Avg rating</p><p className="text-3xl font-black">{ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—'}</p></Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <BarChartVertical
                data={earningsByMonth}
                dataKey="earnings"
                xKey="month"
                title="Earnings by month (£)"
                prefix="£"
              />
            </Card>
            <Card>
              <BarChartHorizontal
                data={tasksByService}
                dataKey="tasks"
                yKey="name"
                title="Tasks by service type"
              />
            </Card>
          </div>
        </div>
      )}
      {activeTab === 'Messages' && (
        <div className="space-y-4">
          {myTasks.filter((booking) => ['Assigned', 'In Progress'].includes(booking.status)).length ? (
            myTasks.filter((booking) => ['Assigned', 'In Progress'].includes(booking.status)).map((booking) => {
              const customer = customers.find((item) => item.id === booking.customerId);
              return (
                <Card key={booking.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-ink">{booking.serviceType}</p>
                    <p className="text-sm text-muted">{customer?.name || 'Customer'} · {booking.status}</p>
                    <p className="text-sm text-muted">{booking.date} at {booking.time}</p>
                  </div>
                  <Button variant="outline" onClick={() => { setContact({ booking, customer }); }} className="flex-shrink-0">
                    <MessageSquare size={16} /> Message
                  </Button>
                </Card>
              );
            })
          ) : (
            <Card className="border-dashed text-center">
              <MessageSquare className="mx-auto text-muted" size={32} />
              <p className="mt-3 font-bold text-muted">No active conversations</p>
              <p className="mt-1 text-sm text-muted">Conversations appear here once you have an assigned or in-progress task.</p>
            </Card>
          )}
        </div>
      )}
      {activeTab === 'Profile' && (
        <div className="space-y-4">
          <AvatarUpload profile={runner} />
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Notifications</h2>
                <p className="mt-1 text-sm text-muted">Get instant alerts on this device when a task is assigned to you.</p>
              </div>
              <Button variant="outline" className="shrink-0 text-sm" onClick={enablePush}>
                <Bell size={14} /> Enable
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Your details</h2>
              {!editingProfile && (
                <Button variant="ghost" className="text-sm" onClick={() => {
                  setProfileForm({ name: authUser.name, email: authUser.email, phone: runner.phone || '', area: runner.area || '', bio: runner.bio || '', transportMethod: runner.transportMethod || '', availabilityNotes: runner.availabilityNotes || '' });
                  setEditingProfile(true);
                }}>
                  <Pencil size={14} /> Edit
                </Button>
              )}
            </div>

            {editingProfile && profileForm ? (
              <form className="mt-4 space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                setProfileSaving(true);
                try { await updateProfile(profileForm); setEditingProfile(false); }
                finally { setProfileSaving(false); }
              }}>
                {[
                  { label: 'Name', field: 'name', type: 'text' },
                  { label: 'Email', field: 'email', type: 'email' },
                  { label: 'Phone', field: 'phone', type: 'tel' },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs font-bold text-muted">{label}</label>
                    <input type={type} className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm" value={profileForm[field]} onChange={(e) => setProfileForm((f) => ({ ...f, [field]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Area you cover</label>
                  <select className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm" value={profileForm.area} onChange={(e) => setProfileForm((f) => ({ ...f, area: e.target.value }))}>
                    {areas.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Transport method</label>
                  <input type="text" className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3 text-sm" value={profileForm.transportMethod} onChange={(e) => setProfileForm((f) => ({ ...f, transportMethod: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Bio</label>
                  <textarea className="focus-ring min-h-20 w-full rounded-lg border border-surface-hi p-3 text-sm" value={profileForm.bio} onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Availability notes</label>
                  <textarea className="focus-ring min-h-20 w-full rounded-lg border border-surface-hi p-3 text-sm" value={profileForm.availabilityNotes} onChange={(e) => setProfileForm((f) => ({ ...f, availabilityNotes: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={profileSaving} className="flex-1">Save changes</Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingProfile(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                {[['Name', authUser.name], ['Email', authUser.email], ['Phone', runner.phone], ['Area', runner.area], ['Transport', runner.transportMethod], ['Bio', runner.bio], ['Availability', runner.availabilityNotes]].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-surface-hi pb-3 last:border-0">
                    <span className="text-muted">{label}</span>
                    <span className="max-w-[60%] text-right font-semibold text-ink">{value || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-ink">Performance</h2>
            <div className="mt-4 space-y-3 text-sm">
              {/* RunnerProfile.rating is never written after signup, so showing it
                  raw put a permanent "0" here while the header showed the real
                  average. Use the same computed value in both places. */}
              {[['Rating', ratings.length ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} from ${ratings.length} review${ratings.length === 1 ? '' : 's'}` : 'No reviews yet'], ['Completed tasks', runner.completedTasks], ['Status', runner.status]].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-surface-hi pb-3 last:border-0">
                  <span className="text-muted">{label}</span>
                  <span className="font-semibold text-ink">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-hi text-muted">
                <WalletCards size={18} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">Payouts</h2>
                <p className="text-sm text-muted">Receive earnings directly to your bank account</p>
              </div>
            </div>

            <div className="mt-4">
              {!connectStatus && (
                <p className="text-sm text-muted">Checking payout status…</p>
              )}
              {connectStatus && !connectStatus.connected && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Set up your payout account to receive earnings from completed tasks. Powered by Stripe.</p>
                  <Button onClick={handleConnectOnboard} loading={connectLoading} className="w-full">
                    <ExternalLink size={14} /> Set up payouts
                  </Button>
                </div>
              )}
              {connectStatus?.connected && !connectStatus.detailsSubmitted && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Your payout setup isn't complete yet.</p>
                  <Button onClick={handleConnectOnboard} loading={connectLoading} variant="outline" className="w-full">
                    <ExternalLink size={14} /> Complete payout setup
                  </Button>
                </div>
              )}
              {connectStatus?.connected && connectStatus.detailsSubmitted && (
                <div className="flex items-center gap-2 rounded-xl bg-surface-hi p-3 text-sm">
                  <ShieldCheck size={16} className="text-secondary" />
                  <span className="font-semibold text-ink">
                    {connectStatus.payoutsEnabled ? 'Payouts active — earnings transfer automatically' : 'Account submitted — awaiting Stripe approval'}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <AccountPrivacy />
        </div>
      )}
      {contact && <Modal title={`${contact.booking.serviceType} · ${contact.customer.name}`} onClose={() => { setContact(null); setMessages([]); setMessageBody(''); }}><div className="space-y-3"><div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-surface-hi p-3 text-sm">{messages.length ? messages.map((message) => {
        const fromMe = message.senderId === authUser.userId;
        return <div key={message.id} className={`rounded-lg p-3 ${fromMe ? 'ml-8 bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'mr-8 bg-surface text-ink'}`}><p className="font-bold">{fromMe ? 'You' : message.senderName}</p><p>{message.body}</p></div>;
      }) : <p className="text-muted">No messages yet.</p>}</div><textarea className="focus-ring min-h-24 w-full rounded-lg border border-surface-hi p-3" placeholder="Type a message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} /><Button className="w-full" loading={messageLoading} disabled={!messageBody.trim()} onClick={submitMessage}>Send message</Button></div></Modal>}

      {asking && (
        <Modal title={`Not got ${asking.name}?`} onClose={() => { setAsking(null); setAskName(''); setAskPhoto(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Suggest something else and they'll get a notification straight away. A photo of the shelf helps them decide.
            </p>
            <label className="block">
              <span className="text-sm font-bold text-ink">What would you get instead?</span>
              <input
                className="focus-ring mt-1 min-h-11 w-full rounded-lg border border-surface-hi px-3"
                placeholder="e.g. Warburtons Toastie 800g"
                value={askName}
                onChange={(e) => setAskName(e.target.value)}
                autoFocus
              />
            </label>
            <PhotoUpload
              kind="SUBSTITUTE"
              label="Photo of the alternative (optional)"
              max={1}
              photos={askPhoto ? [{ id: 'tmp', kind: 'SUBSTITUTE', dataUrl: askPhoto }] : []}
              onAdd={({ dataUrl }) => setAskPhoto(dataUrl)}
              onRemove={() => setAskPhoto(null)}
            />
            <Button className="w-full" loading={askBusy} onClick={sendProposal}>Ask the customer</Button>
          </div>
        </Modal>
      )}

      {completingBooking && (
        <Modal title="Complete task" onClose={() => { setCompletingBooking(null); setGoodsCost(''); }}>
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-hi p-4">
              <p className="font-bold text-ink">{completingBooking.serviceType}</p>
              <p className="text-sm text-muted">{completingBooking.date} at {completingBooking.time}</p>
            </div>
            {/* Mark off what actually happened to each item. This is the point of
                structuring the list — "they didn't have it" becomes a record the
                customer can see rather than something said on the phone. */}
            {detail.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-ink">How did you get on with the list?</p>
                {detail.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-surface-hi p-2">
                    <p className="text-sm font-semibold text-ink">
                      {item.name}{item.quantity ? ` · ${item.quantity}` : ''}
                    </p>
                    {item.backupName && (
                      <p className="text-xs text-muted">Backup: {item.backupName}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        { key: 'BOUGHT', label: 'Got it' },
                        { key: 'UNAVAILABLE', label: "Couldn't get" }
                      ].map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setItemStatus(item.id, option.key, option.key === 'SUBSTITUTED' ? (item.backupName || '') : '')}
                          className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${item.status === option.key ? 'border-stone-900 bg-stone-900 text-white dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-900' : 'border-surface-hi text-muted'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                      {/* Rather than guessing, offer a swap and let them decide
                          while you're still in front of the shelf. */}
                      <button
                        type="button"
                        onClick={() => { setAsking(item); setAskName(item.backupName || ''); setAskPhoto(null); }}
                        className="min-h-9 rounded-lg border border-surface-hi px-3 text-xs font-semibold text-muted"
                      >
                        Ask customer
                      </button>
                    {item.status === 'AWAITING_APPROVAL' && (
                      <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Waiting on an answer about {item.proposedSubstitute}…
                      </p>
                    )}
                    {item.status === 'SUBSTITUTED' && item.substitutedWith && (
                      <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Approved — get {item.substitutedWith}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Evidence for the goods charge. Without it the customer is asked to
                take a typed number on trust — and a carer checking a relative
                wasn't overcharged has nothing to look at. */}
            <PhotoUpload
              kind="RECEIPT"
              label="Photo of the receipt"
              hint="Shows the customer exactly what was spent on their behalf."
              photos={detail.photos}
              onAdd={addReceipt}
              max={3}
            />

            <div>
              <label className="mb-1 block text-sm font-bold text-ink">Cost of goods you purchased</label>
              <p className="mb-2 text-xs text-muted">Enter what you spent on the customer's behalf (e.g. groceries, prescription). Enter 0 if there were none. You'll be reimbursed this amount on top of your payout.</p>
              {budget != null && (
                <p className="mb-2 text-xs font-semibold text-muted">Customer's budget: £{money(budget)}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-muted">£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`focus-ring min-h-11 w-full rounded-lg border px-3 ${overage > 0 ? 'border-amber-500' : 'border-surface-hi'}`}
                  placeholder="0.00"
                  value={goodsCost}
                  onChange={(e) => setGoodsCost(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Over the agreed budget: the customer is charged their budget only,
                so the runner needs to know the excess isn't automatically covered. */}
            {overage > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  £{money(overage)} over the customer's budget
                </p>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                  They'll be charged £{money(budget)} — the amount they agreed — and we'll settle the extra
                  £{money(overage)} with you separately. Please say briefly why, so they understand the difference.
                </p>
                <textarea
                  className="focus-ring min-h-20 w-full rounded-lg border border-amber-300 bg-surface p-3 text-sm dark:border-amber-800"
                  placeholder="e.g. only the 4-pint milk was left, and the bread was a bigger loaf"
                  value={overageReason}
                  onChange={(e) => setOverageReason(e.target.value)}
                />
              </div>
            )}

            <Button
              className="w-full"
              loading={completeLoading}
              disabled={overage > 0 && !overageReason.trim()}
              onClick={submitComplete}
            >
              {Number(goodsCost) > 0 ? `Complete & charge £${money(Math.min(Number(goodsCost), budget ?? Number(goodsCost)))}` : 'Mark complete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
