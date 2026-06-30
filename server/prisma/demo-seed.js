// Demo data seed — SAFE for production.
// Only ever touches @example.com accounts: it deletes existing demo accounts
// (cascading to their bookings/payments/etc.) and recreates a curated snapshot.
// It NEVER deletes real users. To remove all demo data later, run:
//   DELETE FROM "User" WHERE email LIKE '%@example.com';
//
// Run:  cd server && DATABASE_URL="<neon-url>" node prisma/demo-seed.js
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();
const PASSWORD = 'password123';
const fee = (amount) => Math.round(Number(amount) * 0.1 * 100) / 100;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const pi = () => `pi_demo_${Math.random().toString(36).slice(2, 12)}`;

async function main() {
  const passwordHash = await hashPassword(PASSWORD);

  // --- Clean previous demo data (scoped to @example.com only) ---
  const removed = await prisma.user.deleteMany({ where: { email: { endsWith: '@example.com' } } });
  console.log(`Removed ${removed.count} existing demo accounts.`);

  // --- Admin ---
  await prisma.user.create({ data: { name: 'Tom Reed', email: 'admin@example.com', passwordHash, role: 'ADMIN' } });

  // --- Customers ---
  const customerSpecs = [
    { key: 'james', name: 'James Carter', email: 'james@example.com', address: '14 London Road, Leicester', phone: '0116 496 0101', postcodeArea: 'Stoneygate', walletBalance: 57.50 },
    { key: 'margaret', name: 'Margaret Hughes', email: 'margaret@example.com', address: '3 Brocks Hill Drive, Oadby', phone: '0116 496 0102', postcodeArea: 'Oadby', walletBalance: 0 },
    { key: 'sophie', name: 'Sophie Bennett', email: 'sophie@example.com', address: '27 Clarendon Park Road, Leicester', phone: '0116 496 0103', postcodeArea: 'Clarendon Park', walletBalance: 30 }
  ];
  const customers = {};
  for (const c of customerSpecs) {
    const user = await prisma.user.create({
      data: {
        name: c.name, email: c.email, passwordHash, role: 'CUSTOMER',
        customerProfile: { create: { address: c.address, phone: c.phone, postcodeArea: c.postcodeArea, walletBalance: c.walletBalance } }
      },
      include: { customerProfile: true }
    });
    customers[c.key] = { userId: user.id, profile: user.customerProfile, ...c };
  }

  // --- Runners ---
  const runnerSpecs = [
    { key: 'daniel', name: 'Daniel Okafor', email: 'daniel@example.com', phone: '0116 496 0201', area: 'Oadby', bio: 'Friendly, reliable runner covering Oadby and Stoneygate. Quick with grocery and pharmacy runs.', transportMethod: 'Car', availabilityNotes: 'Weekday mornings and Saturdays.', rating: 4.9, completedTasks: 47, status: 'ACTIVE' },
    { key: 'priya', name: 'Priya Sharma', email: 'priya@example.com', phone: '0116 496 0202', area: 'Clarendon Park', bio: 'Experienced local runner. Careful with prescriptions and happy to help older customers.', transportMethod: 'Bike', availabilityNotes: 'Flexible weekdays.', rating: 4.8, completedTasks: 33, status: 'ACTIVE' },
    { key: 'marcus', name: 'Marcus Lee', email: 'marcus@example.com', phone: '0116 496 0203', area: 'Knighton', bio: 'New applicant keen to start running errands around Knighton.', transportMethod: 'Car', availabilityNotes: 'Evenings and weekends.', rating: 0, completedTasks: 0, status: 'PENDING' }
  ];
  const runners = {};
  for (const r of runnerSpecs) {
    const user = await prisma.user.create({
      data: {
        name: r.name, email: r.email, passwordHash, role: 'RUNNER',
        runnerProfile: { create: {
          area: r.area, phone: r.phone, bio: r.bio, transportMethod: r.transportMethod, availabilityNotes: r.availabilityNotes,
          rating: r.rating, completedTasks: r.completedTasks, status: r.status,
          approvedAt: r.status === 'ACTIVE' ? daysAgo(60) : null,
          stripeAccountId: r.status === 'ACTIVE' ? `acct_demo_${r.key}` : null
        } }
      },
      include: { runnerProfile: true }
    });
    runners[r.key] = { userId: user.id, profile: user.runnerProfile, ...r };
  }

  // --- Carer link: James is Margaret's carer (ACTIVE) ---
  await prisma.carerLink.create({
    data: { carerId: customers.james.profile.id, clientId: customers.margaret.profile.id, status: 'ACTIVE' }
  });

  // --- Bookings ---
  const bookingSpecs = [
    { customer: 'james', runner: 'daniel', service: 'GROCERY_SHOPPING', type: 'ONE_OFF_TASK', price: 25, date: daysAgo(6), time: '10:00', status: 'COMPLETED', instructions: 'Weekly shop from Sainsbury\'s — list sent in app.', goodsCost: 42.50, review: { stars: 5, review: 'Daniel was brilliant — fast and friendly, got everything on the list.' } },
    { customer: 'james', runner: 'daniel', service: 'PRESCRIPTION_PICKUP', type: 'ONE_OFF_TASK', price: 25, date: daysAgo(0), time: '15:30', status: 'IN_PROGRESS', instructions: 'Collect repeat prescription from Boots, London Road.' },
    { customer: 'james', service: 'GROCERY_SHOPPING', type: 'WEEKLY_SUBSCRIPTION', subscriptionPlan: '2 tasks/week', price: 38, date: daysAgo(-1), time: '09:30', status: 'PENDING', instructions: 'Twice-weekly essentials — milk, bread, fruit, veg.' },
    { customer: 'margaret', carer: 'james', runner: 'priya', service: 'GROCERY_SHOPPING', type: 'ONE_OFF_TASK', price: 25, date: daysAgo(-2), time: '11:00', status: 'ASSIGNED', instructions: 'Weekly groceries for Mum — please ring the doorbell twice.' },
    { customer: 'sophie', runner: 'priya', service: 'PRESCRIPTION_PICKUP', type: 'ONE_OFF_TASK', price: 25, date: daysAgo(9), time: '13:00', status: 'COMPLETED', instructions: 'Pick up prescription from Clarendon Park pharmacy.', review: { stars: 4, review: 'Quick and clear updates, thank you.' } },
    { customer: 'sophie', service: 'GROCERY_SHOPPING', type: 'ONE_OFF_TASK', price: 25, date: daysAgo(-1), time: '16:00', status: 'PENDING', instructions: 'Small top-up shop from the local Co-op.' }
  ];

  for (const b of bookingSpecs) {
    const cust = customers[b.customer];
    const runner = b.runner ? runners[b.runner] : null;
    const carer = b.carer ? customers[b.carer] : null;
    const platformFeeAmount = fee(b.price);
    const succeeded = b.status !== 'PENDING';

    const booking = await prisma.booking.create({
      data: {
        customerId: cust.profile.id,
        runnerId: runner?.profile.id,
        createdByCarerId: carer?.profile.id || null,
        serviceType: b.service,
        bookingType: b.type,
        subscriptionPlan: b.subscriptionPlan || null,
        date: new Date(`${b.date.toISOString().slice(0, 10)}T00:00:00.000Z`),
        time: b.time,
        price: b.price,
        status: b.status,
        instructions: b.instructions,
        address: cust.address,
        contactPhone: cust.phone,
        postcodeArea: cust.postcodeArea,
        goodsCost: b.goodsCost || null,
        goodsChargedAt: b.goodsCost ? b.date : null,
        payment: { create: {
          amount: b.price,
          currency: 'gbp',
          status: succeeded ? 'SUCCEEDED' : 'REQUIRES_CONFIRMATION',
          stripePaymentIntentId: pi(),
          platformFeeAmount,
          runnerPayoutAmount: Number(b.price) - platformFeeAmount,
          goodsReimbursementAmount: b.status === 'COMPLETED' && b.goodsCost ? b.goodsCost : null,
          goodsTransferId: b.status === 'COMPLETED' && b.goodsCost ? `tr_demo_${Math.random().toString(36).slice(2, 8)}` : null
        } }
      }
    });

    if (b.review && runner) {
      await prisma.review.create({ data: { bookingId: booking.id, customerId: cust.profile.id, runnerId: runner.profile.id, stars: b.review.stars, review: b.review.review } });
    }

    // A couple of messages on the in-progress booking for the Messages tab
    if (b.status === 'IN_PROGRESS' && runner) {
      await prisma.message.create({ data: { bookingId: booking.id, senderId: runner.userId, receiverId: cust.userId, body: 'Hi James — at the pharmacy now, just collecting your prescription.' } });
      await prisma.message.create({ data: { bookingId: booking.id, senderId: cust.userId, receiverId: runner.userId, body: 'Brilliant, thank you Daniel!' } });
    }
  }

  // --- Wallet history for James (top-up + goods charge) ---
  await prisma.walletTransaction.createMany({ data: [
    { customerId: customers.james.profile.id, type: 'DEPOSIT', amount: 100, description: 'Wallet top-up', stripePaymentIntentId: pi() },
    { customerId: customers.james.profile.id, type: 'CHARGE', amount: 42.50, description: 'Cost of goods — Grocery Shopping' }
  ] });
  await prisma.walletTransaction.create({ data: { customerId: customers.sophie.profile.id, type: 'DEPOSIT', amount: 30, description: 'Wallet top-up', stripePaymentIntentId: pi() } });

  console.log('\n✅ Demo data seeded.\n');
  console.log('All accounts use password:', PASSWORD);
  console.log('  Admin    : admin@example.com');
  console.log('  Customer : james@example.com      (has bookings, wallet, is carer for Margaret)');
  console.log('  Client   : margaret@example.com   (James books on her behalf)');
  console.log('  Customer : sophie@example.com');
  console.log('  Runner   : daniel@example.com     (ACTIVE, assigned to James\'s tasks)');
  console.log('  Runner   : priya@example.com      (ACTIVE)');
  console.log('  Runner   : marcus@example.com     (PENDING — approve live in the admin panel)');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
