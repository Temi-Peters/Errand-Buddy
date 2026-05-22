import { CheckCircle2, ClipboardList, MessageSquare, Star, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import BookingCard from '../components/BookingCard';
import Button from '../components/Button';
import Card from '../components/Card';
import { BarChartHorizontal, BarChartVertical } from '../components/Charts';
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
      {activeTab === 'Profile' && <Card><h2 className="text-xl font-bold">Runner profile</h2><div className="mt-4 grid gap-2 text-muted"><p><strong>Area:</strong> {runner.area}</p><p><strong>Bio:</strong> {runner.bio || 'Not provided'}</p><p><strong>Transport:</strong> {runner.transportMethod || 'Not provided'}</p><p><strong>Availability:</strong> {runner.availabilityNotes || 'Not provided'}</p><p><strong>Rating:</strong> {runner.rating}</p><p><strong>Completed tasks:</strong> {runner.completedTasks}</p></div></Card>}
      {contact && <Modal title={`${contact.booking.serviceType} · ${contact.customer.name}`} onClose={() => { setContact(null); setMessages([]); setMessageBody(''); }}><div className="space-y-3"><div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-surface-hi p-3 text-sm">{messages.length ? messages.map((message) => {
        const fromMe = message.senderId === authUser.userId;
        return <div key={message.id} className={`rounded-lg p-3 ${fromMe ? 'ml-8 bg-primary text-white' : 'mr-8 bg-surface text-ink'}`}><p className="font-bold">{fromMe ? 'You' : message.senderName}</p><p>{message.body}</p></div>;
      }) : <p className="text-muted">No messages yet.</p>}</div><textarea className="focus-ring min-h-24 w-full rounded-lg border border-surface-hi p-3" placeholder="Type a message" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} /><Button className="w-full" loading={messageLoading} disabled={!messageBody.trim()} onClick={submitMessage}>Send message</Button></div></Modal>}
    </div>
  );
}
