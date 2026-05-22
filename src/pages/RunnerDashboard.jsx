import { CheckCircle2, ClipboardList, MessageSquare, Star, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import BookingCard from '../components/BookingCard';
import Button from '../components/Button';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';

const tabs = ['Available Tasks', 'My Tasks', 'Earnings', 'Messages', 'Profile'];
const payout = (price) => Math.round(price * 0.9 * 100) / 100;

export default function RunnerDashboard() {
  const { authUser, runners, customers, bookings, updateBooking, acceptBooking, completeRunnerTask, fetchMessages, sendMessage, showToast } = useApp();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const runner = runners.find((item) => item.id === authUser.id);

  useEffect(() => {
    if (!contact) return;

    fetchMessages(contact.booking.id)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [contact]);

  if (!runner) return <Card className="text-center"><p className="font-bold text-muted">Runner profile is loading.</p></Card>;
  if (runner.status === 'Pending') return <Card className="mx-auto max-w-2xl p-8 text-center"><ClipboardList className="mx-auto text-primary" size={42} /><h1 className="mt-4 text-3xl font-black">Application under review</h1><p className="mt-3 text-muted">Thanks for applying to become an Errand Buddy runner. We are reviewing your application and will contact you when a decision is made.</p></Card>;
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
            {booking.status === 'In Progress' && <Button variant="secondary" onClick={() => completeRunnerTask(booking.id, runner.id)}>Mark Complete</Button>}
            {booking.status === 'In Progress' && <Button variant="outline" onClick={() => setContact({ booking, customer })}><MessageSquare size={18} /> Contact Customer</Button>}
            {booking.status === 'Completed' && <p className="font-semibold text-secondary">Completed</p>}
          </>
        )}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[1.5rem] bg-gradient-to-r from-[#1C1830] to-primary p-6 text-white shadow-lift"><p className="text-sm font-black uppercase tracking-wide text-violet-300">Runner dashboard</p><h1 className="mt-2 text-3xl font-black">{runner.name}</h1><p className="mt-1 text-white/60">{runner.area} · Active runner</p></div>
      <div className="grid gap-4 sm:grid-cols-4"><Card><ClipboardList className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Available nearby</p><p className="text-3xl font-black">{available.length}</p></Card><Card><CheckCircle2 className="text-secondary" /><p className="mt-3 text-sm font-bold text-muted">Completed</p><p className="text-3xl font-black">{completed.length}</p></Card><Card><WalletCards className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Earnings</p><p className="text-3xl font-black">£{earnings.toFixed(0)}</p></Card><Card><Star className="text-amber-500" /><p className="mt-3 text-sm font-bold text-muted">Rating</p><p className="text-3xl font-black">{ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : runner.rating}</p></Card></div>
      <div className="flex gap-2 overflow-x-auto rounded-xl bg-surface-hi p-2">{tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`min-h-11 whitespace-nowrap rounded-lg px-4 font-bold transition duration-150 ${activeTab === tab ? 'bg-primary text-white shadow-md shadow-violet-600/20' : 'text-muted hover:bg-surface hover:text-ink'}`}>{tab}</button>)}</div>
      {activeTab === 'Available Tasks' && <div className="grid gap-4">{available.length ? available.map((booking, index) => <BookingCard key={booking.id} booking={booking} actions={<><p className="font-bold text-secondary">Runner payout: £{payout(booking.price)}</p><p className="text-sm text-muted">{(0.7 + index * 0.4).toFixed(1)} miles away</p><Button onClick={() => accept(booking)}>Accept Task</Button></>} />) : <Card className="border-dashed text-center"><p className="font-bold text-muted">No open tasks in your area</p><p className="mt-1 text-sm text-muted">Check back later for new local errands.</p></Card>}</div>}
      {activeTab === 'My Tasks' && <div className="space-y-6">{Object.entries(groupedTasks).map(([status, items]) => <section key={status}><h2 className="mb-3 text-xl font-bold">{status}</h2><div className="grid gap-4">{items.length ? items.map(renderTask) : <Card><p className="text-muted">No {status.toLowerCase()} tasks.</p></Card>}</div></section>)}</div>}
      {activeTab === 'Earnings' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><p className="text-muted">This week</p><p className="text-3xl font-black">£{earnings.toFixed(2)}</p></Card><Card><p className="text-muted">This month</p><p className="text-3xl font-black">£{earnings.toFixed(2)}</p></Card><Card><p className="text-muted">Completed tasks</p><p className="text-3xl font-black">{completed.length}</p></Card><Card><p className="text-muted">Average rating</p><p className="text-3xl font-black">{ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : runner.rating}</p></Card></div>}
      {activeTab === 'Messages' && <Card className="text-center"><MessageSquare className="mx-auto text-primary" /><h2 className="mt-3 text-xl font-bold">Messages</h2><p className="mt-2 text-muted">Open an in-progress task to message the customer.</p></Card>}
      {activeTab === 'Profile' && <Card><h2 className="text-xl font-bold">Runner profile</h2><div className="mt-4 grid gap-2 text-muted"><p><strong>Area:</strong> {runner.area}</p><p><strong>Bio:</strong> {runner.bio || 'Not provided'}</p><p><strong>Transport:</strong> {runner.transportMethod || 'Not provided'}</p><p><strong>Availability:</strong> {runner.availabilityNotes || 'Not provided'}</p><p><strong>Rating:</strong> {runner.rating}</p><p><strong>Completed tasks:</strong> {runner.completedTasks}</p></div></Card>}
      {contact && <Modal title={`${contact.booking.serviceType} · ${contact.customer.name}`} onClose={() => { setContact(null); setMessages([]); setMessageBody(''); }}><div className="space-y-3"><div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-surface-hi p-3 text-sm">{messages.length ? messages.map((message) => {
        const fromMe = message.senderId === authUser.userId;
        return <div key={message.id} className={`rounded-lg p-3 ${fromMe ? 'ml-8 bg-primary text-white' : 'mr-8 bg-surface text-ink'}`}><p className="font-bold">{fromMe ? 'You' : message.senderName}</p><p>{message.body}</p></div>;
      }) : <p className="text-muted">No messages yet.</p>}</div><textarea className="focus-ring min-h-24 w-full rounded-lg border border-surface-hi p-3" placeholder="Type a message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} /><Button className="w-full" loading={messageLoading} disabled={!messageBody.trim()} onClick={submitMessage}>Send message</Button></div></Modal>}
    </div>
  );
}
