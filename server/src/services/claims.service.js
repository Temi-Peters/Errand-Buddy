import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { claimToClient } from '../utils/serializers.js';
import { createRefund } from './stripe.service.js';
import { notifyClaimRaised, notifyClaimResolved } from './notification.service.js';

const claimInclude = {
  customer: { include: { user: true } },
  booking: { include: { payment: true } }
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
    data: { bookingId, customerId: booking.customerId, category, description },
    include: claimInclude
  });

  notifyClaimRaised(claim);
  return claimToClient(claim);
};

// Admin sees all claims; a customer sees claims on their own (or carer-placed) bookings.
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
  } else {
    return [];
  }

  const claims = await prisma.claim.findMany({ where, include: claimInclude, orderBy: { createdAt: 'desc' } });
  return claims.map(claimToClient);
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
