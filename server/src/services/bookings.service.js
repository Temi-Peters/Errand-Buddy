import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  bookingStatusFromClient,
  bookingToClient,
  bookingTypeFromClient,
  serviceTypeFromClient
} from '../utils/serializers.js';
import {
  notifyBookingAssigned,
  notifyBookingCreated,
  notifyReviewSubmitted,
  notifyTaskCompleted,
  notifyTaskStarted
} from './notification.service.js';

const bookingInclude = {
  customer: { include: { user: true } },
  runner: { include: { user: true } },
  review: true,
  payment: true
};

const platformFee = (price) => Math.round(Number(price) * 0.1 * 100) / 100;

const formatStatus = (status) => status.toLowerCase().replace(/_/g, ' ');

const assertTransition = (from, to) => {
  const valid = {
    PENDING_PAYMENT: ['PENDING', 'CANCELLED'],
    PENDING: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: []
  };

  if (from === to) return;

  if (!valid[from]?.includes(to)) {
    throw new ApiError(400, `Invalid booking status transition from ${formatStatus(from)} to ${formatStatus(to)}`);
  }
};

export const listBookings = async (user) => {
  const where = {};

  if (user.role === 'CUSTOMER') {
    where.customerId = user.customerProfile.id;
  }

  if (user.role === 'RUNNER') {
    if (user.runnerProfile.status !== 'ACTIVE') {
      return [];
    }
    where.OR = [
      { runnerId: user.runnerProfile.id },
      { runnerId: null, status: 'PENDING', postcodeArea: user.runnerProfile.area }
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
  });

  return bookings.map(bookingToClient);
};

export const createBooking = async (user, data) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Only customers can create bookings');
  }

  const serviceType = serviceTypeFromClient(data.serviceType);
  if (!serviceType) {
    throw new ApiError(400, 'Valid service type is required');
  }

  const price = Number(data.price);
  if (!price || price <= 0) {
    throw new ApiError(400, 'Valid price is required');
  }

  const fee = platformFee(price);
  const booking = await prisma.booking.create({
    data: {
      customerId: user.customerProfile.id,
      serviceType,
      bookingType: bookingTypeFromClient(data.bookingType),
      subscriptionPlan: data.subscriptionPlan || data.subscription || null,
      date: new Date(`${data.date}T00:00:00.000Z`),
      time: data.time,
      price,
      status: 'PENDING',
      instructions: data.instructions,
      address: data.address,
      contactPhone: data.contactPhone,
      postcodeArea: data.postcodeArea,
      payment: {
        create: {
          amount: price,
          currency: 'gbp',
          status: 'REQUIRES_CONFIRMATION',
          stripePaymentIntentId: `pi_test_mock_${Date.now()}`,
          platformFeeAmount: fee,
          runnerPayoutAmount: price - fee
        }
      }
    },
    include: bookingInclude
  });

  notifyBookingCreated(booking);

  return bookingToClient(booking);
};

export const updateBooking = async (user, id, data) => {
  const existing = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!existing) {
    throw new ApiError(404, 'Booking not found');
  }

  if (user.role === 'CUSTOMER' && existing.customerId !== user.customerProfile.id) {
    throw new ApiError(403, 'You can only update your own bookings');
  }

  if (user.role === 'RUNNER' && existing.runnerId !== user.runnerProfile.id) {
    throw new ApiError(403, 'You can only update assigned bookings');
  }

  const updates = {};
  if (data.runnerId !== undefined && user.role !== 'ADMIN') {
    throw new ApiError(403, 'Only admins can manually assign runners');
  }

  if (data.runnerId !== undefined && user.role === 'ADMIN') {
    if (existing.status !== 'PENDING' || existing.runnerId) {
      throw new ApiError(400, 'Only pending unassigned bookings can be manually assigned');
    }

    if (!data.runnerId) {
      throw new ApiError(400, 'Runner id is required for assignment');
    }

    const runner = await prisma.runnerProfile.findUnique({ where: { id: data.runnerId } });
    if (!runner) {
      throw new ApiError(400, 'Runner not found');
    }
    if (runner.status !== 'ACTIVE') {
      throw new ApiError(400, 'Only active runners can be assigned bookings');
    }

    updates.runnerId = data.runnerId;
    updates.status = 'ASSIGNED';
  }

  if (data.status !== undefined) {
    const status = bookingStatusFromClient(data.status);
    if (!status) throw new ApiError(400, 'Invalid booking status');
    assertTransition(existing.status, status);
    updates.status = status;
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: updates,
    include: bookingInclude
  });

  if (existing.status !== booking.status && booking.status === 'ASSIGNED') {
    notifyBookingAssigned(booking);
  }

  return bookingToClient(booking);
};

export const acceptBooking = async (user, id) => {
  if (user.role !== 'RUNNER' || !user.runnerProfile) {
    throw new ApiError(403, 'Only runners can accept bookings');
  }
  if (user.runnerProfile.status !== 'ACTIVE') {
    throw new ApiError(403, 'Only approved active runners can accept tasks');
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status !== 'PENDING' || booking.runnerId) throw new ApiError(409, 'Booking is not available');
  if (booking.postcodeArea !== user.runnerProfile.area) throw new ApiError(403, 'Booking is outside your area');

  const updated = await prisma.booking.update({
    where: { id },
    data: { runnerId: user.runnerProfile.id, status: 'ASSIGNED' },
    include: bookingInclude
  });

  notifyBookingAssigned(updated);

  return bookingToClient(updated);
};

export const startBooking = async (user, id) => transitionRunnerBooking(user, id, 'ASSIGNED', 'IN_PROGRESS');

export const completeBooking = async (user, id) => {
  const updated = await transitionRunnerBooking(user, id, 'IN_PROGRESS', 'COMPLETED');

  await prisma.runnerProfile.update({
    where: { id: user.runnerProfile.id },
    data: { completedTasks: { increment: 1 } }
  });

  return updated;
};

const transitionRunnerBooking = async (user, id, requiredStatus, nextStatus) => {
  if (user.role !== 'RUNNER' || !user.runnerProfile) {
    throw new ApiError(403, 'Only runners can update task progress');
  }
  if (user.runnerProfile.status !== 'ACTIVE') {
    throw new ApiError(403, 'Only active runners can update task progress');
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.runnerId !== user.runnerProfile.id) throw new ApiError(403, 'Booking is not assigned to you');
  if (requiredStatus && booking.status !== requiredStatus) throw new ApiError(409, `Booking must be ${requiredStatus}`);
  assertTransition(booking.status, nextStatus);

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: nextStatus },
    include: bookingInclude
  });

  if (nextStatus === 'IN_PROGRESS') {
    notifyTaskStarted(updated);
  }

  if (nextStatus === 'COMPLETED') {
    notifyTaskCompleted(updated);
  }

  return bookingToClient(updated);
};

export const reviewBooking = async (user, id, data) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Only customers can review bookings');
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customerId !== user.customerProfile.id) throw new ApiError(403, 'You can only review your bookings');
  if (booking.status !== 'COMPLETED' || !booking.runnerId) throw new ApiError(409, 'Only completed runner bookings can be reviewed');

  const savedReview = await prisma.review.upsert({
    where: { bookingId: id },
    update: { stars: Number(data.stars), review: data.review || '' },
    create: {
      bookingId: id,
      customerId: booking.customerId,
      runnerId: booking.runnerId,
      stars: Number(data.stars),
      review: data.review || ''
    }
  });

  notifyReviewSubmitted(savedReview);

  const updated = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  return bookingToClient(updated);
};
