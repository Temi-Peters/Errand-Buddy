import { CalendarCheck, Clock, MessageSquare, Pencil, Plus, Star, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BookingCard from '../components/BookingCard';
import Button from '../components/Button';
import Card from '../components/Card';
import { BarChartHorizontal, DonutChart } from '../components/Charts';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { areas } from '../data/options';

const tabs = ['Overview', 'My Bookings', 'Messages', 'Account'];

export default function CustomerDashboard() {
  const { authUser, bookings, runners, customers, updateBooking, fetchMessages, sendMessage, updateProfile, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('Overview');
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

  const renderBooking = (booking) => (
    <BookingCard
      key={booking.id}
      booking={booking}
      runner={runners.find((r) => r.id === booking.runnerId)}
      actions={(
        <>
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
        </>
      )}
    />
  );

  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Customer dashboard</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome back, {authUser.name.split(' ')[0]}.</h1>
        <p className="mt-1 text-stone-400">
          {activeBookings.length > 0
            ? `You have ${activeBookings.length} active ${activeBookings.length === 1 ? 'booking' : 'bookings'}.`
            : 'No active bookings right now.'}
        </p>
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
        </div>
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
                  <div key={msg.id} className={`rounded-lg p-3 ${fromMe ? 'ml-8 bg-primary text-white' : 'mr-8 bg-surface text-ink'}`}>
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
