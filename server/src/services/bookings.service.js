import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createPaymentIntent, createTransfer, retrievePaymentIntent, updatePaymentIntentMetadata } from './stripe.service.js';
import {
  bookingStatusFromClient,
  bookingToClient,
  bookingTypeFromClient,
  serviceTypeFromClient,
  serviceTypeToClient
} from '../utils/serializers.js';
import { chargeForGoods } from './wallet.service.js';
import { resolvePricing } from '../config/pricing.js';
import {
  notifyBookingAssigned,
  notifyBookingCancelled,
  notifyBookingCreated,
  notifyCompletionProblem,
  notifyGoodsCharged,
  notifyReviewSubmitted,
  notifyTaskCompleted,
  notifyTaskStarted
} from './notification.service.js';
import { assertActiveCarerLink } from './carers.service.js';

const bookingInclude = {
  customer: { include: { user: true } },
  runner: { include: { user: true } },
  createdByCarer: { include: { user: true } },
  review: true,
  payment: true
};

const platformFee = (price) => Math.round(Number(price) * 0.1 * 100) / 100;

const formatStatus = (status) => status.toLowerCase().replace(/_/g, ' ');

// Which statuses each role may set through the generic PATCH endpoint. Runners
// get nothing here on purpose — they progress work through accept/start/complete,
// which carry their own ownership and state guards. null means "any transition
// the state machine allows", i.e. admin.
const ROLE_STATUS_CHANGES = {
  CUSTOMER: new Set(['CANCELLED']),
  RUNNER: new Set(),
  ADMIN: null
};

const assertTransition = (from, to) => {
  const valid = {
    PENDING_PAYMENT: ['PENDING', 'CANCELLED'],
    PENDING: ['ASSIGNED', 'CANCELLED', 'ON_HOLD'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'ON_HOLD'],
    ON_HOLD: ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
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
    // A customer sees their own bookings plus any they placed as a carer for a client.
    where.OR = [
      { customerId: user.customerProfile.id },
      { createdByCarerId: user.customerProfile.id }
    ];
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

  // A runner sees unassigned jobs in their area so they can accept them, but the
  // customer's address and contact details stay hidden until they're assigned.
  return bookings.map((booking) => bookingToClient(booking, {
    redactCustomerContact: user.role === 'RUNNER' && booking.runnerId !== user.runnerProfile.id
  }));
};

// Services open for customer booking — update here when new services launch
const BOOKABLE_SERVICE_TYPES = new Set(['GROCERY_SHOPPING', 'PRESCRIPTION_PICKUP']);

export const createBooking = async (user, data) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Only customers can create bookings');
  }

  const serviceType = serviceTypeFromClient(data.serviceType);
  if (!serviceType) {
    throw new ApiError(400, 'Valid service type is required');
  }

  if (!BOOKABLE_SERVICE_TYPES.has(serviceType)) {
    throw new ApiError(400, 'This service is not currently available for booking');
  }

  // Price is derived server-side from the booking tier — a client-supplied amount is
  // never trusted, so a customer cannot pay an arbitrary price for a booking.
  const bookingType = bookingTypeFromClient(data.bookingType);

  // Carer-assisted booking: when onBehalfOf is set, the authenticated user is the
  // carer placing a booking under the client's profile. The carer pays the service
  // fee with their own card (the PaymentIntent is unchanged — they're at checkout).
  let customerId = user.customerProfile.id;
  let createdByCarerId = null;
  const onBehalfOf = data.onBehalfOf ? String(data.onBehalfOf) : null;
  if (onBehalfOf && onBehalfOf !== user.customerProfile.id) {
    await assertActiveCarerLink(user.customerProfile.id, onBehalfOf);
    customerId = onBehalfOf;
    createdByCarerId = user.customerProfile.id;
  }

  // Gate new bookings on the payer's wallet: a negative balance (run up by goods
  // charges) must be cleared before booking again. The payer is the carer for
  // carer-placed bookings, otherwise the customer.
  const payerId = createdByCarerId || customerId;
  const payer = await prisma.customerProfile.findUnique({
    where: { id: payerId },
    select: { walletBalance: true }
  });
  if (payer && Number(payer.walletBalance) < 0) {
    throw new ApiError(400, createdByCarerId
      ? `Your wallet balance is negative (−£${Math.abs(Number(payer.walletBalance)).toFixed(2)}). Please top up before booking on someone's behalf.`
      : `Your wallet balance is negative (−£${Math.abs(Number(payer.walletBalance)).toFixed(2)}). Please top up your wallet before booking.`);
  }

  // Introductory offer, decided entirely server-side. Eligibility is "this
  // customer has never had a booking that wasn't cancelled" — counted on the
  // customer receiving the service, not the carer paying, so a carer can't farm
  // the offer across the people they help.
  const priorBookings = await prisma.booking.count({
    where: { customerId, status: { not: 'CANCELLED' } }
  });
  const pricing = resolvePricing(bookingType, data.subscriptionPlan || data.subscription || data.bookingType, {
    isFirstBooking: priorBookings === 0
  });
  if (pricing == null) {
    throw new ApiError(400, 'Could not determine the price for this booking. Please reselect your plan.');
  }

  const { listPrice, discount, chargeAmount: price } = pricing;

  // The runner is paid on the LIST price even when the customer paid less — the
  // promotion is the platform's acquisition cost, not a pay cut for the runner.
  // On a discounted booking that makes platformFeeAmount negative, which is the
  // honest record: the platform is subsidising this errand.
  const runnerPayout = Math.round((listPrice - platformFee(listPrice)) * 100) / 100;
  const fee = Math.round((price - runnerPayout) * 100) / 100;

  // Create the Stripe PaymentIntent first so we have a real intent ID to store
  const intent = await createPaymentIntent({
    amount: price,
    currency: 'gbp',
    metadata: { customerId, serviceType, ...(createdByCarerId ? { createdByCarerId } : {}) }
  });

  const booking = await prisma.booking.create({
    data: {
      customerId,
      createdByCarerId,
      serviceType,
      bookingType,
      subscriptionPlan: data.subscriptionPlan || data.subscription || null,
      date: new Date(`${data.date}T00:00:00.000Z`),
      time: data.time,
      price,
      discountAmount: discount > 0 ? discount : null,
      status: 'PENDING_PAYMENT',
      instructions: data.instructions,
      address: data.address,
      contactPhone: data.contactPhone,
      postcodeArea: data.postcodeArea,
      payment: {
        create: {
          amount: price,
          currency: 'gbp',
          status: 'REQUIRES_CONFIRMATION',
          stripePaymentIntentId: intent.id,
          platformFeeAmount: fee,
          runnerPayoutAmount: runnerPayout
        }
      }
    },
    include: bookingInclude
  });

  // Backfill the bookingId into the intent metadata now we have the real ID
  // Fire-and-forget — webhook matches by stripePaymentIntentId, so this is best-effort
  updatePaymentIntentMetadata(intent.id, { bookingId: booking.id }).catch(() => {});

  notifyBookingCreated(booking);

  return {
    booking: bookingToClient(booking),
    clientSecret: intent.client_secret
  };
};

export const updateBooking = async (user, id, data) => {
  const existing = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!existing) {
    throw new ApiError(404, 'Booking not found');
  }

  if (user.role === 'CUSTOMER'
    && existing.customerId !== user.customerProfile.id
    && existing.createdByCarerId !== user.customerProfile.id) {
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
    updates.assignedAt = new Date();
  }

  if (data.status !== undefined) {
    const status = bookingStatusFromClient(data.status);
    if (!status) throw new ApiError(400, 'Invalid booking status');

    // The state machine says which transitions are legal; this says who may make
    // them. Without it an assigned runner could cancel a booking the customer had
    // already paid for (no refund is issued on this path), and a customer could
    // mark their own booking COMPLETED — skipping the runner's completion flow
    // entirely — or ASSIGNED, leaving a booking assigned to nobody.
    const allowed = ROLE_STATUS_CHANGES[user.role];
    if (allowed && !allowed.has(status)) {
      throw new ApiError(403, user.role === 'RUNNER'
        ? 'Use the task actions on your dashboard to update a job.'
        : 'You cannot set a booking to that status.');
    }

    assertTransition(existing.status, status);
    updates.status = status;
    // Stamp the lifecycle so fulfilment timing is measurable. Only on an actual
    // change of status, so a repeated PATCH doesn't move the clock.
    if (status !== existing.status) {
      if (status === 'CANCELLED') updates.cancelledAt = new Date();
      if (status === 'ASSIGNED' && !existing.assignedAt) updates.assignedAt = new Date();
    }
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: updates,
    include: bookingInclude
  });

  if (existing.status !== booking.status && booking.status === 'ASSIGNED') {
    notifyBookingAssigned(booking);
  }

  // A runner who isn't told will travel to an address for a job that no longer
  // exists. Only worth sending if someone was actually assigned.
  if (existing.status !== booking.status && booking.status === 'CANCELLED' && existing.runnerId) {
    notifyBookingCancelled(booking, { cancelledByRole: user.role });
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
    data: { runnerId: user.runnerProfile.id, status: 'ASSIGNED', assignedAt: new Date() },
    include: bookingInclude
  });

  notifyBookingAssigned(updated);

  return bookingToClient(updated);
};

export const startBooking = async (user, id) => transitionRunnerBooking(user, id, 'ASSIGNED', 'IN_PROGRESS');

export const completeBooking = async (user, id, goodsCostInput = 0) => {
  const goodsCost = Number(goodsCostInput) || 0;
  if (goodsCost < 0) throw new ApiError(400, 'Cost of goods cannot be negative');
  if (goodsCost > 1000) throw new ApiError(400, 'Cost of goods looks too high — please double-check');

  const updated = await transitionRunnerBooking(user, id, 'IN_PROGRESS', 'COMPLETED');

  // Anything that fails after this point does NOT roll the completion back — the
  // work is done — but every failure is collected and reported rather than logged
  // and forgotten. See the catch blocks below.
  const problems = [];

  await prisma.runnerProfile.update({
    where: { id: user.runnerProfile.id },
    data: { completedTasks: { increment: 1 } }
  });

  // Charge the payer for the cost of goods. The payer is the carer when the booking
  // was placed on a client's behalf, otherwise the customer themselves.
  let chargeResult = null;
  if (goodsCost > 0) {
    try {
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (booking && !booking.goodsChargedAt) {
        const payerId = booking.createdByCarerId || booking.customerId;
        chargeResult = await chargeForGoods(payerId, goodsCost, id, `Cost of goods — ${serviceTypeToClient(booking.serviceType)}`);
        await prisma.booking.update({
          where: { id },
          data: { goodsCost, goodsChargedAt: new Date() }
        });
      }
    } catch (err) {
      // Don't fail the completion — the runner has already done the work — but
      // this must not disappear into the logs. Silently swallowing it meant a
      // runner could front £60 of shopping, be told "complete", and never learn
      // that nobody had been charged and they were never going to be repaid.
      console.error(`[goods] Failed to charge goods for booking ${id}:`, err.message);
      problems.push({ stage: 'goods-charge', message: err.message });
    }
  }

  // Trigger runner payout (service fee + goods reimbursement) if Connect + payment ready
  try {
    const payment = await prisma.payment.findUnique({ where: { bookingId: id } });
    const runner = await prisma.runnerProfile.findUnique({ where: { id: user.runnerProfile.id } });

    if (payment?.status === 'SUCCEEDED' && runner?.stripeAccountId) {
      if (!payment.stripeTransferId) {
        const transfer = await createTransfer({
          amount: Number(payment.runnerPayoutAmount),
          destination: runner.stripeAccountId,
          metadata: { bookingId: id, runnerId: runner.id, type: 'service_payout' }
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripeTransferId: transfer.id }
        });
      }

      // Reimburse the runner for goods they fronted (separate from the service payout)
      if (goodsCost > 0 && !payment.goodsTransferId) {
        const goodsTransfer = await createTransfer({
          amount: goodsCost,
          destination: runner.stripeAccountId,
          metadata: { bookingId: id, runnerId: runner.id, type: 'goods_reimbursement' }
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { goodsReimbursementAmount: goodsCost, goodsTransferId: goodsTransfer.id }
        });
      }
    }
  } catch (err) {
    // Transfers are retryable (POST /payments/runner/transfer is idempotent), so
    // completion still stands — but the runner and an admin need to know it
    // didn't happen rather than assuming they've been paid.
    console.error(`[payout] Failed to transfer for booking ${id}:`, err.message);
    problems.push({ stage: 'runner-payout', message: err.message });
  }

  // Tell someone. The runner gets an honest status back in the response, and the
  // team gets an email so it can actually be chased.
  if (problems.length) {
    notifyCompletionProblem({
      bookingId: id,
      runnerName: user.name,
      runnerEmail: user.email,
      goodsCost,
      problems
    });
  }

  if (goodsCost > 0) {
    const fresh = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });

    // Receipt to whoever was charged — the carer for carer-placed bookings, else the customer
    if (chargeResult) {
      const payer = fresh.createdByCarer || fresh.customer;
      notifyGoodsCharged({
        to: payer?.user?.email,
        name: payer?.user?.name || 'there',
        userId: payer?.userId,
        serviceLabel: serviceTypeToClient(fresh.serviceType),
        amount: goodsCost,
        newBalance: chargeResult.newBalance,
        forClientName: fresh.createdByCarerId ? fresh.customer?.user?.name : null
      });
    }

    // completionProblems rides along on the DTO so the runner's dashboard can say
    // "done, but the payment side didn't go through" instead of a clean success.
    return { ...bookingToClient(fresh), completionProblems: problems };
  }

  return { ...updated, completionProblems: problems };
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
    data: {
      status: nextStatus,
      ...(nextStatus === 'IN_PROGRESS' ? { startedAt: new Date() } : {}),
      ...(nextStatus === 'COMPLETED' ? { completedAt: new Date() } : {})
    },
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

export const getBookingClientSecret = async (user, id) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Customers only');
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true }
  });

  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customerId !== user.customerProfile.id
    && booking.createdByCarerId !== user.customerProfile.id) {
    throw new ApiError(403, 'Not your booking');
  }
  if (booking.status !== 'PENDING_PAYMENT') throw new ApiError(400, 'Payment already completed for this booking');
  if (!booking.payment?.stripePaymentIntentId) throw new ApiError(400, 'No payment intent found for this booking');

  const intent = await retrievePaymentIntent(booking.payment.stripePaymentIntentId);
  return { clientSecret: intent.client_secret, price: Number(booking.price) };
};

export const reviewBooking = async (user, id, data) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Only customers can review bookings');
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.customerId !== user.customerProfile.id
    && booking.createdByCarerId !== user.customerProfile.id) {
    throw new ApiError(403, 'You can only review your bookings');
  }
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
