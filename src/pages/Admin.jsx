import { useMemo, useState } from 'react';
import { BarChart3, ClipboardList, MessageSquare, PoundSterling, UserCheck, Users } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { BarChartHorizontal, BarChartVertical, DonutChart, MultiBarChart } from '../components/Charts';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const tabs = ['Overview', 'Runner Management', 'All Bookings', 'Customers', 'Messages', 'Customer Feedback', 'Revenue'];
const statuses = ['All', 'Pending Payment', 'Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

export default function Admin() {
  const { bookings, customers, runners, updateBooking, updateRunnerStatus, showToast } = useApp();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRunner, setSelectedRunner] = useState(runners[0]);
  const filteredBookings = statusFilter === 'All' ? bookings : bookings.filter((booking) => booking.status === statusFilter);
  const completed = bookings.filter((booking) => booking.status === 'Completed');
  const revenue = bookings.reduce((sum, booking) => sum + Number(booking.price), 0);
  const runnerPayouts = bookings.reduce((sum, booking) => sum + Number(booking.payment?.runnerPayoutAmount || Number(booking.price) * 0.9), 0);
  const feedback = bookings.filter((booking) => booking.rating);

  const recent = useMemo(() => [...bookings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [bookings]);

  // Chart data
  const bookingsByStatus = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  const bookingsByService = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => { counts[b.serviceType] = (counts[b.serviceType] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [bookings]);

  const revenueByMonth = useMemo(() => Object.values(
    bookings.reduce((acc, b) => {
      const month = new Date(b.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      acc[month] = acc[month] || { month, revenue: 0, commission: 0 };
      acc[month].revenue = Math.round((acc[month].revenue + Number(b.price)) * 100) / 100;
      acc[month].commission = Math.round((acc[month].commission + Number(b.price) * 0.1) * 100) / 100;
      return acc;
    }, {})
  ), [bookings]);

  const runnerLeaderboard = useMemo(() => runners
    .filter((r) => r.status === 'Active')
    .map((r) => ({
      name: r.name.split(' ')[0],
      tasks: bookings.filter((b) => b.runnerId === r.id && b.status === 'Completed').length
    }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 6),
  [runners, bookings]);

  const assign = (bookingId, runnerId) => {
    updateBooking(bookingId, { runnerId, status: 'Assigned' });
    showToast('Runner assigned');
  };

  const customerName = (id) => customers.find((customer) => customer.id === id)?.name || 'Unknown';
  const runnerName = (id) => runners.find((runner) => runner.id === id)?.name || 'Unassigned';
  const runnerDetail = selectedRunner || runners[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-stone-900 p-5 text-white shadow-lift sm:p-6 dark:bg-zinc-900"><p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Operations</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Admin panel</h1><p className="mt-1 text-stone-400">Marketplace overview, runner approvals and booking operations.</p></div>
      <div className="flex justify-center">
        <div className="flex gap-2 overflow-x-auto rounded-xl bg-surface-hi p-2">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`min-h-11 whitespace-nowrap rounded-lg px-4 font-semibold transition duration-150 ${activeTab === tab ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-muted hover:bg-surface hover:text-ink'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card><ClipboardList className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Bookings</p><p className="text-3xl font-black">{bookings.length}</p></Card>
            <Card><PoundSterling className="text-secondary" /><p className="mt-3 text-sm font-bold text-muted">Revenue</p><p className="text-3xl font-black">£{revenue.toFixed(0)}</p></Card>
            <Card><BarChart3 className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Commission</p><p className="text-3xl font-black">£{(revenue * 0.1).toFixed(0)}</p></Card>
            <Card><UserCheck className="text-secondary" /><p className="mt-3 text-sm font-bold text-muted">Active runners</p><p className="text-3xl font-black">{runners.filter((runner) => runner.status === 'Active').length}</p></Card>
            <Card><Users className="text-primary" /><p className="mt-3 text-sm font-bold text-muted">Applications</p><p className="text-3xl font-black">{runners.filter((runner) => runner.status === 'Pending').length}</p></Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <DonutChart data={bookingsByStatus} title="Bookings by status" />
            </Card>
            <Card>
              <BarChartHorizontal data={bookingsByService} dataKey="count" yKey="name" title="Bookings by service" />
            </Card>
            <Card>
              <BarChartVertical data={runnerLeaderboard} dataKey="tasks" xKey="name" title="Runner leaderboard (completed tasks)" />
            </Card>
          </div>
          <Card><h2 className="mb-3 text-xl font-bold">Recent bookings</h2><div className="space-y-3">{recent.map((booking) => <div key={booking.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-hi pb-3 last:border-0"><span className="font-semibold">{booking.serviceType} · {customerName(booking.customerId)}</span><StatusBadge status={booking.status} /></div>)}</div></Card>
        </div>
      )}

      {activeTab === 'Runner Management' && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-muted"><th className="p-2">Name</th><th>Area</th><th>Rating</th><th>Completed</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{runners.map((runner) => <tr key={runner.id} onClick={() => setSelectedRunner(runner)} className="cursor-pointer border-t border-surface-hi hover:bg-surface-hi"><td className="p-2 font-bold">{runner.name}<span className="block font-normal text-muted">{runner.email}</span></td><td>{runner.area}</td><td>{runner.rating}</td><td>{runner.completedTasks}</td><td><StatusBadge status={runner.status} /></td><td className="space-x-2">{runner.status === 'Pending' && <><Button onClick={(event) => { event.stopPropagation(); updateRunnerStatus(runner.id, 'ACTIVE'); }}>Approve</Button><Button variant="danger" onClick={(event) => { event.stopPropagation(); updateRunnerStatus(runner.id, 'REJECTED', 'Application was not approved.'); }}>Reject</Button></>}{runner.status === 'Active' && <Button variant="outline" onClick={(event) => { event.stopPropagation(); updateRunnerStatus(runner.id, 'SUSPENDED'); }}>Suspend</Button>}{['Suspended', 'Rejected'].includes(runner.status) && <Button variant="outline" onClick={(event) => { event.stopPropagation(); updateRunnerStatus(runner.id, 'ACTIVE'); }}>Reactivate</Button>}</td></tr>)}</tbody>
            </table>
          </Card>
          <Card>
            {runnerDetail ? <><h2 className="text-xl font-bold">{runnerDetail.name}</h2>
            <p className="text-muted">{runnerDetail.email} · {runnerDetail.area}</p>
            <div className="mt-3 text-sm text-muted"><p><strong>Phone:</strong> {runnerDetail.phone || 'Not provided'}</p><p><strong>Transport:</strong> {runnerDetail.transportMethod || 'Not provided'}</p><p><strong>Bio:</strong> {runnerDetail.bio || 'Not provided'}</p></div>
            <h3 className="mt-4 font-bold">Task history</h3>
            <div className="mt-2 space-y-2">{bookings.filter((booking) => booking.runnerId === runnerDetail.id).map((booking) => <div key={booking.id} className="rounded-lg bg-surface-hi p-3 text-sm"><strong>{booking.serviceType}</strong><p>{booking.date} · {booking.status}</p></div>)}</div></> : <p className="text-muted">No runners yet.</p>}
          </Card>
        </div>
      )}

      {activeTab === 'All Bookings' && (
        <Card className="overflow-x-auto">
          <div className="mb-4 flex flex-wrap gap-2">{statuses.map((status) => <button key={status} onClick={() => setStatusFilter(status)} className={`min-h-11 rounded-lg px-3 font-bold ${statusFilter === status ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-surface-hi text-muted hover:text-ink'}`}>{status}</button>)}</div>
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead><tr className="text-muted"><th className="p-2">Booking</th><th>Customer</th><th>Runner</th><th>Price</th><th>Status</th><th>Assign</th></tr></thead>
            <tbody>{filteredBookings.map((booking) => <tr key={booking.id} className="border-t border-surface-hi"><td className="p-2 font-bold">{booking.serviceType}<span className="block font-normal text-muted">{booking.date} {booking.time}</span></td><td>{customerName(booking.customerId)}</td><td>{runnerName(booking.runnerId)}</td><td>£{booking.price}</td><td><StatusBadge status={booking.status} /></td><td>{booking.status === 'Pending' && !booking.runnerId ? <select className="focus-ring min-h-11 rounded-lg border border-slate-200 px-2" defaultValue="" onChange={(e) => e.target.value && assign(booking.id, e.target.value)}><option value="">Choose runner</option>{runners.filter((runner) => runner.status === 'Active').map((runner) => <option key={runner.id} value={runner.id}>{runner.name}</option>)}</select> : '-'}</td></tr>)}</tbody>
          </table>
        </Card>
      )}

      {activeTab === 'Customers' && <Card className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="text-muted"><th className="p-2">Customer</th><th>Email</th><th>Phone</th><th>Bookings</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-t border-surface-hi"><td className="p-2 font-bold">{customer.name}<span className="block font-normal text-muted">{customer.address}</span></td><td>{customer.email}</td><td>{customer.phone}</td><td>{bookings.filter((booking) => booking.customerId === customer.id).length}</td></tr>)}</tbody></table></Card>}
      {activeTab === 'Messages' && <Card className="text-center"><MessageSquare className="mx-auto text-primary" /><h2 className="mt-3 text-xl font-bold">Message threads</h2><p className="mt-2 text-muted">Admin support visibility is available through booking conversations in the API. A threaded support inbox can be added after launch.</p></Card>}
      {activeTab === 'Customer Feedback' && <div className="grid gap-4">{feedback.length ? feedback.map((booking) => <Card key={booking.id}><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{booking.serviceType}</h3><p className="text-muted">{customerName(booking.customerId)} about {runnerName(booking.runnerId)}</p></div><p className="font-black text-secondary">{booking.rating.stars} stars</p></div><p className="mt-3 text-muted">{booking.rating.review}</p></Card>) : <Card><p className="text-muted">No feedback yet.</p></Card>}</div>}
      {activeTab === 'Revenue' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><p className="text-sm font-bold text-muted">Customer payments</p><p className="text-3xl font-black">£{revenue.toFixed(2)}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Runner payouts</p><p className="text-3xl font-black">£{runnerPayouts.toFixed(2)}</p></Card>
            <Card><p className="text-sm font-bold text-muted">Platform commission</p><p className="text-3xl font-black">£{(revenue - runnerPayouts).toFixed(2)}</p></Card>
          </div>
          <Card>
            <MultiBarChart
              data={revenueByMonth}
              xKey="month"
              title="Revenue vs commission by month"
              prefix="£"
              bars={[
                { key: 'revenue', label: 'Revenue', color: '#0EA5E9' },
                { key: 'commission', label: 'Commission', color: '#10B981' }
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
