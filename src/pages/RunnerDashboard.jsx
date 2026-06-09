import { CheckCircle2, ClipboardList, ExternalLink, MessageSquare, Pencil, ShieldCheck, Star, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import BookingCard from '../components/BookingCard';
import Button from '../components/Button';
import Card from '../components/Card';
import { BarChartHorizontal, BarChartVertical } from '../components/Charts';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { areas } from '../data/options';

const tabs = ['Available Tasks', 'My Tasks', 'Earnings', 'Messages', 'Profile'];
const payout = (price) => Math.round(price * 0.9 * 100) / 100;

export default function RunnerDashboard() {
  const { authUser, runners, customers, bookings, updateBooking, acceptBooking, completeRunnerTask, fetchMessages, sendMessage, updateProfile, showToast } = useApp();
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
  const [completeLoading, setCompleteLoading] = useState(false);
  const runner = runners.find((item) => item.id === authUser.id);

  const submitComplete = async () => {
    if (!completingBooking) return;
    setCompleteLoading(true);
    try {
      await completeRunnerTask(completingBooking.id, runner.id, Number(goodsCost) || 0);
      setCompletingBooking(null);
      setGoodsCost('');
    } catch {
      /* toast shown by context */
    } finally {
      setCompleteLoading(false);
    }
  };

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

  useEffect(() => {
    if (!contact) return;

    fetchMessages(contact.booking.id)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [contact]);

  if (!runner) return <Card className="text-center"><p className="font-bold text-muted">Runner profile is loading.</p></Card>;
  if (runner.status === 'Pending') return <Card className="mx-auto max-w-2xl p-8 text-center"><ClipboardList className="mx-auto text-primary" size={42} /><h1 className="mt-4 text-3xl font-black">Application under review</h1><p className="mt-3 text-muted">Thanks for applying to become an ErrandBuddy runner. We are reviewing your application and will contact you when a decision is made.</p></Card>;
  if (runner.status === 'Rejected') return <Card className="mx-auto max-w-2xl p-8 text-center"><h1 className="text-3xl font-black">Application not approved</h1><p className="mt-3 text-muted">{runner.rejectionReason || 'Your application was not approved. Contact support if you have questions.'}</p></Card>;
  if (runner.status === 'Suspended') return <Card className="mx-auto max-w-2xl p-8 text-center"><h1 className="text-3xl font-black">Runner account suspended</h1><p className="mt-3 text-muted">Your runner account is currently suspended. Please contact support for help.</p></Card>;

  const available = bookings.filter((booking) => booking.status === 'Pending' && !booking.runnerId && booking.postcodeArea === runner.area);
  const myTasks = bookings.filter((booking) => booking.runnerId === runner.id);
  const groupedTasks = {
    Assigned: myTasks.filter((booking) => booking.status === 'Assigned'),
    'In Progress': myTasks.filter((booking) => booking.status === 'In Progress'),
    Completed: myTasks.filter((booking) => booking.status === 'Completed')
  };
  const completed = bookings.filter((booking) => booking.runnerId === runner.id && booking.status === 'Completed');
  const earnings = completed.reduce((sum, booking) => sum + payout(booking.price), 0);
  const ratings = completed.map((booking) => booking.rating?.stars).filter(Boolean);

  // Chart data
  const earningsByMonth = Object.values(
    completed.reduce((acc, booking) => {
      const month = new Date(booking.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      acc[month] = acc[month] || { month, earnings: 0 };
      acc[month].earnings += payout(booking.price);
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

  const accept = async (booking) => {
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
            <div className="w-full text-sm text-muted"><p><strong>Address:</strong> {booking.address}</p><p><strong>Phone:</strong> {booking.contactPhone}</p><p><strong>Instructions:</strong> {booking.instructions}</p></div>
            {booking.status === 'Assigned' && <Button onClick={() => updateBooking(booking.id, { status: 'In Progress' })}>Start Task</Button>}
            {booking.status === 'In Progress' && <Button variant="secondary" onClick={() => { setCompletingBooking(booking); setGoodsCost(''); }}>Mark Complete</Button>}
            {booking.status === 'In Progress' && <Button variant="outline" onClick={() => setContact({ booking, customer })}><MessageSquare size={18} /> Contact Customer</Button>}
            {booking.status === 'Completed' && <p className="font-semibold text-secondary">Completed</p>}
          </>
        )}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900"><p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Runner dashboard</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{runner.name}</h1><p className="mt-1 text-stone-400">{runner.area} · Active runner</p></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Card><ClipboardList className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Available nearby</p><p className="text-3xl font-black">{available.length}</p></Card><Card><CheckCircle2 className="text-secondary" /><p className="mt-3 text-sm font-bold text-muted">Completed</p><p className="text-3xl font-black">{completed.length}</p></Card><Card><WalletCards className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Earnings</p><p className="text-3xl font-black">£{earnings.toFixed(0)}</p></Card><Card><Star className="text-amber-500" /><p className="mt-3 text-sm font-bold text-muted">Rating</p><p className="text-3xl font-black">{ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : runner.rating}</p></Card></div>
      <div className="flex justify-center">
        <div className="flex gap-2 overflow-x-auto rounded-xl bg-surface-hi p-2">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`min-h-11 whitespace-nowrap rounded-lg px-4 font-semibold transition duration-150 ${activeTab === tab ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-muted hover:bg-surface hover:text-ink'}`}>{tab}</button>
          ))}
        </div>
      </div>
      {activeTab === 'Available Tasks' && <div className="grid gap-4">{available.length ? available.map((booking, index) => <BookingCard key={booking.id} booking={booking} actions={<><p className="font-bold text-secondary">Runner payout: £{payout(booking.price)}</p><p className="text-sm text-muted">{(0.7 + index * 0.4).toFixed(1)} miles away</p><Button onClick={() => accept(booking)}>Accept Task</Button></>} />) : <Card className="border-dashed text-center"><p className="font-bold text-muted">No open tasks in your area</p><p className="mt-1 text-sm text-muted">Check back later for new local errands.</p></Card>}</div>}
      {activeTab === 'My Tasks' && <div className="space-y-6">{Object.entries(groupedTasks).map(([status, items]) => <section key={status}><h2 className="mb-3 text-xl font-bold">{status}</h2><div className="grid gap-4">{items.length ? items.map(renderTask) : <Card><p className="text-muted">No {status.toLowerCase()} tasks.</p></Card>}</div></section>)}</div>}
      {activeTab === 'Earnings' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><p className="text-sm font-bold text-muted">Total earned</p><p className="text-3xl font-black">£{earnings.toFixed(2)}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Completed tasks</p><p className="text-3xl font-black">{completed.length}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Avg per task</p><p className="text-3xl font-black">£{completed.length ? (earnings / completed.length).toFixed(2) : '0.00'}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Avg rating</p><p className="text-3xl font-black">{ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : runner.rating}</p></Card>
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
              {[['Rating', runner.rating], ['Completed tasks', runner.completedTasks], ['Status', runner.status]].map(([label, value]) => (
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
        </div>
      )}
      {contact && <Modal title={`${contact.booking.serviceType} · ${contact.customer.name}`} onClose={() => { setContact(null); setMessages([]); setMessageBody(''); }}><div className="space-y-3"><div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-surface-hi p-3 text-sm">{messages.length ? messages.map((message) => {
        const fromMe = message.senderId === authUser.userId;
        return <div key={message.id} className={`rounded-lg p-3 ${fromMe ? 'ml-8 bg-primary text-white' : 'mr-8 bg-surface text-ink'}`}><p className="font-bold">{fromMe ? 'You' : message.senderName}</p><p>{message.body}</p></div>;
      }) : <p className="text-muted">No messages yet.</p>}</div><textarea className="focus-ring min-h-24 w-full rounded-lg border border-surface-hi p-3" placeholder="Type a message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} /><Button className="w-full" loading={messageLoading} disabled={!messageBody.trim()} onClick={submitMessage}>Send message</Button></div></Modal>}

      {completingBooking && (
        <Modal title="Complete task" onClose={() => { setCompletingBooking(null); setGoodsCost(''); }}>
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-hi p-4">
              <p className="font-bold text-ink">{completingBooking.serviceType}</p>
              <p className="text-sm text-muted">{completingBooking.date} at {completingBooking.time}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-ink">Cost of goods you purchased</label>
              <p className="mb-2 text-xs text-muted">Enter what you spent on the customer's behalf (e.g. groceries, prescription). Enter 0 if there were none. You'll be reimbursed this amount on top of your payout.</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-muted">£</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="focus-ring min-h-11 w-full rounded-lg border border-surface-hi px-3"
                  placeholder="0.00"
                  value={goodsCost}
                  onChange={(e) => setGoodsCost(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <Button className="w-full" loading={completeLoading} onClick={submitComplete}>
              {Number(goodsCost) > 0 ? `Complete & charge £${Number(goodsCost).toFixed(2)}` : 'Mark complete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
