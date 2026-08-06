import { prisma } from '../config/prisma.js';

// Answers "is this a viable product that can scale", which running totals cannot:
// ten people booking once and one person booking ten times look identical in a
// revenue figure and mean completely different things.
//
// Everything here is derived from rows the app already writes. No tracking
// pixels, no third-party analytics, no consent banner.

// Two different questions need two different definitions of "counts", and
// conflating them is how repeat behaviour gets understated.
//
// LIVE_STATUSES — money the platform actually kept. A cancelled booking is
// refunded, so it is not revenue.
const LIVE_STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'];

// wasPaidFor — did this customer actually transact? Someone who booked, paid,
// and later cancelled DID come back; whether the errand completed is a
// fulfilment question, not a demand one. Reaching a live status means the
// payment webhook cleared, and a succeeded/refunded Payment catches the ones
// cancelled afterwards. Never counts PENDING_PAYMENT — that money never moved.
const wasPaidFor = (booking) => (
  LIVE_STATUSES.includes(booking.status)
  || booking.payment?.status === 'SUCCEEDED'
  || booking.payment?.status === 'REFUNDED'
);

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const round = (value, dp = 1) => (value == null ? null : Math.round(value * 10 ** dp) / 10 ** dp);
const minutesBetween = (from, to) => (to.getTime() - from.getTime()) / 60000;
const daysBetween = (from, to) => (to.getTime() - from.getTime()) / 86400000;

// ISO week key (Mon-anchored) so cohorts line up with how people actually think
// about "the week we ran the pilot".
const weekKey = (date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
};

export const getInsights = async () => {
  const [bookings, customers, runners] = await Promise.all([
    prisma.booking.findMany({
      select: {
        id: true, customerId: true, createdByCarerId: true, runnerId: true, status: true,
        price: true, discountAmount: true, createdAt: true, assignedAt: true,
        startedAt: true, completedAt: true, cancelledAt: true,
        payment: { select: { platformFeeAmount: true, runnerPayoutAmount: true, status: true } }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.customerProfile.findMany({ select: { id: true, createdAt: true } }),
    prisma.runnerProfile.findMany({ select: { id: true, status: true, completedTasks: true } })
  ]);

  // ─── Bookings ──────────────────────────────────────────────────────────────
  const byStatus = {};
  bookings.forEach((b) => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });

  // Revenue-bearing bookings (excludes cancelled/refunded).
  const paid = bookings.filter((b) => LIVE_STATUSES.includes(b.status));
  // Bookings the customer actually paid for, including ones cancelled later.
  const transacted = bookings.filter(wasPaidFor);
  // A booking still sitting on PENDING_PAYMENT was created and never paid for.
  // That is the checkout drop-off, and it is measurable without instrumenting
  // the form — the row itself is the evidence.
  const abandonedUnpaid = bookings.filter((b) => b.status === 'PENDING_PAYMENT').length;
  const reachedCheckout = bookings.length;

  // ─── Repeat behaviour — the number that actually matters ───────────────────
  // Counted on the customer receiving the errand. A carer booking for three
  // different people is three relationships, not one repeat customer.
  const paidByCustomer = new Map();
  transacted.forEach((b) => {
    const list = paidByCustomer.get(b.customerId) || [];
    list.push(b);
    paidByCustomer.set(b.customerId, list);
  });

  const activated = paidByCustomer.size;
  const repeatCustomers = [...paidByCustomer.values()].filter((list) => list.length >= 2).length;

  const daysToSecond = [...paidByCustomer.values()]
    .filter((list) => list.length >= 2)
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
      return daysBetween(sorted[0].createdAt, sorted[1].createdAt);
    });

  const bookingsPerCustomer = [...paidByCustomer.values()].map((list) => list.length);

  // ─── Fulfilment ────────────────────────────────────────────────────────────
  // Null stamps mean "before this was instrumented", not "instant" — excluded
  // rather than counted as zero, which would flatter the numbers.
  const assignDurations = bookings
    .filter((b) => b.assignedAt)
    .map((b) => minutesBetween(b.createdAt, b.assignedAt))
    .filter((mins) => mins >= 0);

  const completionDurations = bookings
    .filter((b) => b.startedAt && b.completedAt)
    .map((b) => minutesBetween(b.startedAt, b.completedAt))
    .filter((mins) => mins >= 0);

  const everAssigned = bookings.filter((b) => b.assignedAt || b.runnerId).length;
  const cancelledAfterAssignment = bookings.filter((b) => b.status === 'CANCELLED' && (b.assignedAt || b.runnerId)).length;
  const completed = bookings.filter((b) => b.status === 'COMPLETED');

  // ─── Economics ─────────────────────────────────────────────────────────────
  // Gross is what customers were actually charged; subsidy is what promotions
  // cost. Net is deliberately shown even when negative — at an £8 intro price on
  // a £25 tariff the platform is paying for each booking, and that should be
  // visible rather than buried.
  const gross = paid.reduce((sum, b) => sum + Number(b.price), 0);
  const subsidy = paid.reduce((sum, b) => sum + Number(b.discountAmount || 0), 0);
  const runnerPayouts = paid.reduce((sum, b) => sum + Number(b.payment?.runnerPayoutAmount || 0), 0);
  const commission = paid.reduce((sum, b) => sum + Number(b.payment?.platformFeeAmount || 0), 0);

  // ─── Weekly cohorts ────────────────────────────────────────────────────────
  const weeks = new Map();
  const bump = (key, field) => {
    const row = weeks.get(key) || { week: key, newCustomers: 0, bookings: 0, completed: 0, cancelled: 0 };
    row[field] += 1;
    weeks.set(key, row);
  };
  customers.forEach((c) => bump(weekKey(c.createdAt), 'newCustomers'));
  bookings.forEach((b) => {
    bump(weekKey(b.createdAt), 'bookings');
    if (b.status === 'COMPLETED') bump(weekKey(b.createdAt), 'completed');
    if (b.status === 'CANCELLED') bump(weekKey(b.createdAt), 'cancelled');
  });

  const activeRunners = runners.filter((r) => r.status === 'ACTIVE');
  const runnersWhoWorked = runners.filter((r) => r.completedTasks > 0).length;

  return {
    generatedAt: new Date().toISOString(),
    // Surfaced so nobody reads a 0% assignment rate as a failure when it just
    // means the stamps predate the bookings.
    coverage: {
      bookingsWithLifecycleStamps: bookings.filter((b) => b.assignedAt || b.completedAt || b.cancelledAt).length,
      totalBookings: bookings.length,
      note: 'Timing metrics only cover bookings created after lifecycle stamps were added.'
    },
    customers: {
      registered: customers.length,
      activated,
      activationRate: customers.length ? round((activated / customers.length) * 100) : null,
      repeatCustomers,
      repeatRate: activated ? round((repeatCustomers / activated) * 100) : null,
      medianDaysToSecondBooking: round(median(daysToSecond)),
      medianBookingsPerActivatedCustomer: round(median(bookingsPerCustomer))
    },
    bookings: {
      total: bookings.length,
      paid: paid.length,
      byStatus,
      abandonedUnpaid,
      checkoutCompletionRate: reachedCheckout ? round((paid.length / reachedCheckout) * 100) : null
    },
    fulfilment: {
      everAssigned,
      assignmentRate: paid.length ? round((everAssigned / paid.length) * 100) : null,
      completionRate: paid.length ? round((completed.length / paid.length) * 100) : null,
      cancelledAfterAssignment,
      medianMinutesToAssign: round(median(assignDurations)),
      medianMinutesToComplete: round(median(completionDurations))
    },
    economics: {
      grossCharged: round(gross, 2),
      promotionalSubsidy: round(subsidy, 2),
      runnerPayouts: round(runnerPayouts, 2),
      platformNet: round(commission, 2),
      averageOrderValue: paid.length ? round(gross / paid.length, 2) : null
    },
    runners: {
      total: runners.length,
      active: activeRunners.length,
      whoCompletedAtLeastOne: runnersWhoWorked,
      medianCompletedTasks: round(median(runners.map((r) => r.completedTasks)))
    },
    weekly: [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week))
  };
};
