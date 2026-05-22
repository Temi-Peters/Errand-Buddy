import { CalendarCheck, Clock, MessageSquare, Star, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import BookingCard from '../components/BookingCard';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';

export default function CustomerDashboard() {
  const { authUser, bookings, runners, updateBooking, fetchMessages, sendMessage, showToast } = useApp();
  const [ratingBooking, setRatingBooking] = useState(null);
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const mine = bookings.filter((booking) => booking.customerId === authUser.id);
  const grouped = {
    'Awaiting Payment': mine.filter((booking) => booking.status === 'Pending Payment'),
    Pending: mine.filter((booking) => booking.status === 'Pending'),
    Assigned: mine.filter((booking) => booking.status === 'Assigned'),
    'In Progress': mine.filter((booking) => booking.status === 'In Progress'),
    Completed: mine.filter((booking) => booking.status === 'Completed'),
    Cancelled: mine.filter((booking) => booking.status === 'Cancelled')
  };
  const subscription = mine.find((booking) => booking.bookingType.includes('Weekly') && booking.status !== 'Completed');
  const activeCount = mine.filter((booking) => !['Completed', 'Cancelled'].includes(booking.status)).length;
  const completedCount = grouped.Completed.length;
  const totalSpend = mine.reduce((sum, booking) => sum + Number(booking.price), 0);

  const saveRating = () => {
    updateBooking(ratingBooking.id, { rating: { stars, review } });
    showToast('Rating saved');
    setRatingBooking(null);
    setReview('');
  };

  useEffect(() => {
    if (!contact) return;

    fetchMessages(contact.booking.id)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [contact]);

  const openMessages = (booking) => {
    const runner = runners.find((item) => item.id === booking.runnerId);
    setContact({ booking, runner });
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

  const renderBooking = (booking) => (
    <BookingCard
      key={booking.id}
      booking={booking}
      runner={runners.find((runner) => runner.id === booking.runnerId)}
      actions={(
        <>
          {booking.runnerId && ['Assigned', 'In Progress'].includes(booking.status) && <Button variant="outline" onClick={() => openMessages(booking)}><MessageSquare size={18} /> Contact Runner</Button>}
          {['Pending Payment', 'Pending', 'Assigned'].includes(booking.status) && <Button variant="danger" onClick={() => updateBooking(booking.id, { status: 'Cancelled' })}>Cancel booking</Button>}
          {booking.status === 'Completed' && (booking.rating ? <p className="font-semibold text-secondary">{booking.rating.stars} stars: {booking.rating.review}</p> : <Button variant="outline" onClick={() => setRatingBooking(booking)}>Rate Service</Button>)}
        </>
      )}
    />
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-stone-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Customer dashboard</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your errands, clearly organised</h1>
        <p className="mt-2 text-stone-400">Track bookings, message runners, and review completed work.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-muted">Active bookings</p><p className="text-3xl font-black text-ink">{activeCount}</p></div><Clock className="text-primary" /></div></Card>
        <Card><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-muted">Completed</p><p className="text-3xl font-black text-ink">{completedCount}</p></div><CalendarCheck className="text-secondary" /></div></Card>
        <Card className="col-span-2 sm:col-span-1"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-muted">Booked value</p><p className="text-3xl font-black text-ink">£{totalSpend.toFixed(0)}</p></div><WalletCards className="text-primary" /></div></Card>
      </div>
      {subscription && <Card className="border-secondary/40"><h2 className="font-bold text-ink">Active subscription</h2><p className="text-muted">{subscription.bookingType} for {subscription.serviceType}, £{subscription.price}/week</p></Card>}
      {Object.entries(grouped).map(([status, items]) => (
        <section key={status}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black text-ink">{status}</h2><span className="rounded-full bg-surface-hi px-3 py-1 text-xs font-black text-muted shadow-sm">{items.length}</span></div>
          <div className="grid gap-4">{items.length ? items.map(renderBooking) : <Card className="border-dashed text-center"><p className="font-bold text-muted">No {status.toLowerCase()} bookings</p><p className="mt-1 text-sm text-muted">New activity will appear here automatically.</p></Card>}</div>
        </section>
      ))}
      {ratingBooking && (
        <Modal title="Rate this service" onClose={() => setRatingBooking(null)}>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => <button key={value} className="p-1 text-amber-400" onClick={() => setStars(value)}><Star fill={value <= stars ? 'currentColor' : 'none'} /></button>)}
            </div>
            <textarea className="focus-ring min-h-28 w-full rounded-lg border border-slate-200 p-3" placeholder="Review" value={review} onChange={(e) => setReview(e.target.value)} />
            <Button onClick={saveRating} className="w-full">Save rating</Button>
          </div>
        </Modal>
      )}
      {contact && (
        <Modal title={`${contact.booking.serviceType} · ${contact.runner?.name || 'Runner'}`} onClose={() => { setContact(null); setMessages([]); setMessageBody(''); }}>
          <div className="space-y-3">
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-surface-hi p-3 text-sm">
              {messages.length ? messages.map((message) => {
                const fromMe = message.senderId === authUser.userId;
                return <div key={message.id} className={`rounded-lg p-3 ${fromMe ? 'ml-8 bg-primary text-white' : 'mr-8 bg-surface text-ink'}`}><p className="font-bold">{fromMe ? 'You' : message.senderName}</p><p>{message.body}</p></div>;
              }) : <p className="text-muted">No messages yet.</p>}
            </div>
            <textarea className="focus-ring min-h-24 w-full rounded-lg border border-slate-200 p-3" placeholder="Type a message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
            <Button className="w-full" loading={messageLoading} disabled={!messageBody.trim()} onClick={submitMessage}>Send message</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
