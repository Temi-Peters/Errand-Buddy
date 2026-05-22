import { prisma } from '../config/prisma.js';
import { bookingToClient, runnerToClient } from '../utils/serializers.js';

export const overview = async (req, res, next) => {
  try {
    const [bookings, runners, customers] = await Promise.all([
      prisma.booking.findMany({
        include: {
          customer: { include: { user: true } },
          runner: { include: { user: true } },
          review: true,
          payment: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.runnerProfile.findMany({ include: { user: true } }),
      prisma.customerProfile.count()
    ]);

    const revenue = bookings.reduce((sum, booking) => sum + Number(booking.price), 0);

    res.json({
      metrics: {
        bookings: bookings.length,
        customers,
        revenue,
        commission: Math.round(revenue * 0.1 * 100) / 100,
        activeRunners: runners.filter((runner) => runner.status === 'ACTIVE').length,
        pendingRunnerApplications: runners.filter((runner) => runner.status === 'PENDING').length,
        pendingBookings: bookings.filter((booking) => booking.status === 'PENDING').length,
        todayBookings: bookings.filter((booking) => booking.createdAt.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        runnerPayouts: bookings.reduce((sum, booking) => sum + Number(booking.payment?.runnerPayoutAmount || 0), 0)
      },
      bookings: bookings.map(bookingToClient),
      runners: runners.map(runnerToClient)
    });
  } catch (error) {
    next(error);
  }
};
