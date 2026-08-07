import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { claimToClient } from '../utils/serializers.js';
import { createRefund } from './stripe.service.js';
import { notifyClaimRaised, notifyClaimRaisedToRunner, notifyClaimReply, notifyClaimResolved } from './notification.service.js';

const claimInclude = {
  customer: { include: { user: true } },
  // The runner is party to the claim, so their user record has to be loadable
  // for notifications and for the thread's authorisation check.
  runner: { include: { user: true } },
  booking: { include: { payment: true, createdByCarer: true } },
  _count: { select: { messages: true } }
};

// A customer (or the carer who placed the booking) raises a claim on their booking.
export const createClaim = async (user, bookingId, data) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Only customers can raise a claim');
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new ApiError(404, 'Booking not found');

  const profileId = user.customerProfile.id;
  if (booking.customerId !== profileId && booking.createdByCarerId !== profileId) {
    throw new ApiError(403, 'You can only raise a claim on your own booking');
  }
  if (booking.status === 'PENDING_PAYMENT') {
    throw new ApiError(400, 'You can only raise a claim on a confirmed booking');
  }

  const openExisting = await prisma.claim.findFirst({ where: { bookingId, status: 'OPEN' } });
  if (openExisting) throw new ApiError(409, 'There is already an open claim for this booking');

  const category = String(data.category || '').trim();
  const description = String(data.description || '').trim();
  if (!category || !description) throw new ApiError(400, 'A category and description are required');

  const claim = await prisma.claim.create({
    // Bind the claim to the runner it concerns. Without this a runner could be
    // named, have a refund taken against their work, and never be told.
    data: { bookingId, customerId: booking.customerId, runnerId: booking.runnerId || null, category, description },
    include: claimInclude
  });

  notifyClaimRaised(claim);
  // The person the claim is about finds out at the same time as the team, not
  // after a decision has already been made.
  const withRunner = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { runner: { include: { user: true } } }
  });
  notifyClaimRaisedToRunner(claim, withRunner);
  return claimToClient(claim, user);
};

// Admin sees all claims; a customer sees claims on their own (or carer-placed) bookings.
// Previously returned [] for every runner, so someone could be named in a claim,
// have money taken off their pay, and never know it happened.
export const listClaims = async (user) => {
  let where;
  if (user.role === 'ADMIN') {
    where = {};
  } else if (user.role === 'CUSTOMER' && user.customerProfile) {
    where = {
      OR: [
        { customerId: user.customerProfile.id },
        { booking: { createdByCarerId: user.customerProfile.id } }
      ]
    };
  } else if (user.role === 'RUNNER' && user.runnerProfile) {
    // A runner sees claims naming them — nothing else.
    where = { runnerId: user.runnerProfile.id };
  } else {
    return [];
  }

  const claims = await prisma.claim.findMany({ where, include: claimInclude, orderBy: { createdAt: 'desc' } });
  return claims.map((claim) => claimToClient(claim, user));
};

// Anyone party to the claim: the customer who raised it, the carer who placed
// the booking, the runner it names, or an admin.
const loadClaimFor = async (user, claimId) => {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { ...claimInclude, messages: { include: { sender: true }, orderBy: { createdAt: 'asc' } } }
  });
  if (!claim) throw new ApiError(404, 'Claim not found');

  const isCustomer = user.customerProfile
    && (claim.customerId === user.customerProfile.id || claim.booking?.createdByCarerId === user.customerProfile.id);
  const isRunner = user.runnerProfile && claim.runnerId === user.runnerProfile.id;
  if (user.role !== 'ADMIN' && !isCustomer && !isRunner) {
    throw new ApiError(403, 'You are not party to this claim');
  }
  return { claim, isRunner };
};

export const getClaimThread = async (user, claimId) => {
  const { claim } = await loadClaimFor(user, claimId);
  return {
    claim: claimToClient(claim, user),
    messages: claim.messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.senderId,
      senderName: m.sender?.name || 'Unknown',
      senderRole: m.sender?.role?.toLowerCase() || 'user',
      createdAt: m.createdAt.toISOString()
    }))
  };
};

export const postClaimMessage = async (user, claimId, body) => {
  const { claim, isRunner } = await loadClaimFor(user, claimId);
  const text = String(body || '').trim();
  if (!text) throw new ApiError(400, 'Write a message first');
  if (claim.status !== 'OPEN') throw new ApiError(409, 'This issue has already been settled');

  const message = await prisma.claimMessage.create({
    data: { claimId, senderId: user.id, body: text.slice(0, 2000) },
    include: { sender: true }
  });

  // Stamped so an admin can see at a glance whether the runner has had their say
  // before any money moves.
  if (isRunner && !claim.runnerRepliedAt) {
    await prisma.claim.update({ where: { id: claimId }, data: { runnerRepliedAt: new Date() } });
  }

  // Tell the other side, whoever that is.
  const recipients = [
    claim.customer?.userId,
    claim.runner?.userId
  ].filter((id) => id && id !== user.id);
  recipients.forEach((id) => notifyClaimReply(claim, id, user.name));

  return {
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    senderName: message.sender?.name,
    senderRole: message.sender?.role?.toLowerCase(),
    createdAt: message.createdAt.toISOString()
  };
};

// Admin resolves a claim: reject, or resolve with an optional Stripe refund.
export const resolveClaim = async (user, claimId, data) => {
  if (user.role !== 'ADMIN') throw new ApiError(403, 'Admins only');

  const claim = await prisma.claim.findUnique({ where: { id: claimId }, include: claimInclude });
  if (!claim) throw new ApiError(404, 'Claim not found');
  if (claim.status !== 'OPEN') throw new ApiError(409, 'This claim has already been resolved');

  const note = String(data.note || '').trim() || null;

  if (data.action === 'reject') {
    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: { status: 'REJECTED', resolutionNote: note, resolvedAt: new Date() },
      include: claimInclude
    });
    notifyClaimResolved(updated);
    return claimToClient(updated);
  }

  // resolve — optionally issue a Stripe refund of the service fee
  let refundAmount = Number(data.refundAmount) || 0;
  let stripeRefundId = null;

  if (refundAmount > 0) {
    const payment = claim.booking.payment;
    if (!payment?.stripePaymentIntentId || payment.status !== 'SUCCEEDED') {
      throw new ApiError(400, 'This booking has no completed card payment to refund');
    }
    const maxRefundable = Number(payment.amount);
    if (refundAmount > maxRefundable) refundAmount = maxRefundable;

    const refund = await createRefund({
      paymentIntentId: payment.stripePaymentIntentId,
      amount: refundAmount,
      metadata: { claimId, bookingId: claim.bookingId }
    });
    stripeRefundId = refund.id;

    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
  }

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: {
      status: 'RESOLVED',
      resolutionNote: note,
      refundAmount: refundAmount > 0 ? refundAmount : null,
      stripeRefundId,
      resolvedAt: new Date()
    },
    include: claimInclude
  });

  notifyClaimResolved(updated);
  return claimToClient(updated);
};
