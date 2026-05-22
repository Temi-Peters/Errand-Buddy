import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

const customers = [
  { name: 'Aisha Patel', email: 'aisha@example.com', address: '18 London Road, Leicester', phone: '0116 555 0141', postcodeArea: 'Stoneygate' },
  { name: 'Tom Richards', email: 'tom@example.com', address: '42 Queens Road, Leicester', phone: '0116 555 0142', postcodeArea: 'Clarendon Park' },
  { name: 'Mina Shah', email: 'mina@example.com', address: '7 The Parade, Oadby', phone: '0116 555 0143', postcodeArea: 'Oadby' },
  { name: 'George Allen', email: 'george@example.com', address: '22 Wakerley Road, Leicester', phone: '0116 555 0144', postcodeArea: 'Evington' },
  { name: 'Priya Kaur', email: 'priya@example.com', address: '5 Shanklin Drive, Leicester', phone: '0116 555 0145', postcodeArea: 'Knighton' }
];

const runners = [
  { name: 'Sam Carter', email: 'sam@example.com', phone: '0116 555 0201', area: 'Oadby', bio: 'Reliable local runner covering Oadby and nearby errands.', transportMethod: 'Car', availabilityNotes: 'Weekday mornings and Saturday afternoons.', rating: 4.8, completedTasks: 38, status: 'ACTIVE' },
  { name: 'Leah Brooks', email: 'leah@example.com', phone: '0116 555 0202', area: 'Stoneygate', bio: 'Experienced grocery and prescription pickup runner.', transportMethod: 'Bike', availabilityNotes: 'Flexible weekdays.', rating: 4.9, completedTasks: 52, status: 'ACTIVE' },
  { name: 'Imran Hussain', email: 'imran@example.com', phone: '0116 555 0203', area: 'Clarendon Park', bio: 'Local runner for dog walks and general errands.', transportMethod: 'Car', availabilityNotes: 'Evenings and weekends.', rating: 4.7, completedTasks: 29, status: 'ACTIVE' },
  { name: 'Nia Thompson', email: 'nia@example.com', phone: '0116 555 0204', area: 'Evington', bio: 'Careful and friendly runner for household errands.', transportMethod: 'Car', availabilityNotes: 'Weekends.', rating: 4.6, completedTasks: 21, status: 'SUSPENDED' }
];

const bookings = [
  { customerEmail: 'aisha@example.com', runnerEmail: 'leah@example.com', serviceType: 'GROCERY_SHOPPING', bookingType: 'WEEKLY_SUBSCRIPTION', subscriptionPlan: '2 tasks/week', date: '2026-05-09', time: '10:00', price: 50, status: 'ASSIGNED', instructions: 'Pick up weekly shop from Highcross list.' },
  { customerEmail: 'tom@example.com', runnerEmail: 'imran@example.com', serviceType: 'DOG_WALKING', bookingType: 'ONE_OFF_TASK', date: '2026-05-03', time: '08:30', price: 18, status: 'COMPLETED', instructions: '30 minute walk for Milo.', review: { stars: 5, review: 'Reliable and friendly.' } },
  { customerEmail: 'mina@example.com', serviceType: 'PRESCRIPTION_PICKUP', bookingType: 'ONE_OFF_TASK', date: '2026-05-10', time: '14:00', price: 17, status: 'PENDING', instructions: 'Collect from Boots Oadby.' },
  { customerEmail: 'george@example.com', runnerEmail: 'nia@example.com', serviceType: 'DRY_CLEANING', bookingType: 'ONE_OFF_TASK', date: '2026-05-07', time: '16:30', price: 16, status: 'IN_PROGRESS', instructions: 'Collect two suits.' },
  { customerEmail: 'priya@example.com', serviceType: 'GENERAL_ERRANDS', bookingType: 'WEEKLY_SUBSCRIPTION', subscriptionPlan: '1 task/week', date: '2026-05-12', time: '11:00', price: 28, status: 'PENDING', instructions: 'Post parcels and buy stamps.' },
  { customerEmail: 'aisha@example.com', runnerEmail: 'leah@example.com', serviceType: 'PRESCRIPTION_PICKUP', bookingType: 'ONE_OFF_TASK', date: '2026-04-22', time: '12:30', price: 19, status: 'COMPLETED', instructions: 'Collect repeat prescription.', review: { stars: 4, review: 'Quick pickup, clear updates.' } },
  { customerEmail: 'tom@example.com', serviceType: 'GROCERY_SHOPPING', bookingType: 'ONE_OFF_TASK', date: '2026-05-11', time: '09:30', price: 20, status: 'PENDING', instructions: 'Small shop from Queens Road Tesco.' },
  { customerEmail: 'mina@example.com', runnerEmail: 'sam@example.com', serviceType: 'DOG_WALKING', bookingType: 'WEEKLY_SUBSCRIPTION', subscriptionPlan: '3 tasks/week', date: '2026-05-08', time: '07:45', price: 66, status: 'ASSIGNED', instructions: 'Walk Bella in Brocks Hill park.' },
  { customerEmail: 'george@example.com', runnerEmail: 'nia@example.com', serviceType: 'GENERAL_ERRANDS', bookingType: 'ONE_OFF_TASK', date: '2026-04-29', time: '15:00', price: 15, status: 'COMPLETED', instructions: 'Return parcel and pick up batteries.', review: { stars: 5, review: 'Handled everything perfectly.' } },
  { customerEmail: 'priya@example.com', serviceType: 'DRY_CLEANING', bookingType: 'ONE_OFF_TASK', date: '2026-05-13', time: '17:30', price: 18, status: 'PENDING', instructions: 'Drop off coat and dress.' }
];

const fee = (amount) => Math.round(Number(amount) * 0.1 * 100) / 100;

async function main() {
  const passwordHash = await hashPassword('password123');

  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.runnerProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN'
    }
  });

  for (const customer of customers) {
    await prisma.user.create({
      data: {
        name: customer.name,
        email: customer.email,
        passwordHash,
        role: 'CUSTOMER',
        customerProfile: {
          create: {
            address: customer.address,
            phone: customer.phone,
            postcodeArea: customer.postcodeArea
          }
        }
      }
    });
  }

  for (const runner of runners) {
    await prisma.user.create({
      data: {
        name: runner.name,
        email: runner.email,
        passwordHash,
        role: 'RUNNER',
        runnerProfile: {
          create: {
            area: runner.area,
            phone: runner.phone,
            bio: runner.bio,
            transportMethod: runner.transportMethod,
            availabilityNotes: runner.availabilityNotes,
            rating: runner.rating,
            completedTasks: runner.completedTasks,
            status: runner.status,
            approvedAt: runner.status === 'ACTIVE' ? new Date() : null,
            suspendedAt: runner.status === 'SUSPENDED' ? new Date() : null,
            stripeAccountId: `acct_test_${runner.email.split('@')[0]}`
          }
        }
      }
    });
  }

  const seededCustomers = await prisma.customerProfile.findMany({ include: { user: true } });
  const seededRunners = await prisma.runnerProfile.findMany({ include: { user: true } });

  for (const booking of bookings) {
    const customer = seededCustomers.find((item) => item.user.email === booking.customerEmail);
    const runner = seededRunners.find((item) => item.user.email === booking.runnerEmail);
    const platformFeeAmount = fee(booking.price);

    const created = await prisma.booking.create({
      data: {
        customerId: customer.id,
        runnerId: runner?.id,
        serviceType: booking.serviceType,
        bookingType: booking.bookingType,
        subscriptionPlan: booking.subscriptionPlan,
        date: new Date(`${booking.date}T00:00:00.000Z`),
        time: booking.time,
        price: booking.price,
        status: booking.status,
        instructions: booking.instructions,
        address: customer.address,
        contactPhone: customer.phone,
        postcodeArea: customer.postcodeArea,
        payment: {
          create: {
            amount: booking.price,
            currency: 'gbp',
            status: booking.status === 'PENDING' ? 'REQUIRES_CONFIRMATION' : 'SUCCEEDED',
            stripePaymentIntentId: `pi_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            platformFeeAmount,
            runnerPayoutAmount: Number(booking.price) - platformFeeAmount
          }
        }
      }
    });

    if (booking.review && runner) {
      await prisma.review.create({
        data: {
          bookingId: created.id,
          customerId: customer.id,
          runnerId: runner.id,
          stars: booking.review.stars,
          review: booking.review.review
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
