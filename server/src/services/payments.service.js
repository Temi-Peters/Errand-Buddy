import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';

export const createMockPaymentIntent = async ({ bookingId, amount }) => {
  const booking = bookingId ? await prisma.booking.findUnique({ where: { id: bookingId } }) : null;
  const paymentAmount = Number(amount || booking?.price);

  if (!paymentAmount || paymentAmount <= 0) {
    throw new ApiError(400, 'Valid amount or bookingId is required');
  }

  const platformFeeAmount = Math.round(paymentAmount * (env.platformFeePercent / 100) * 100) / 100;
  const runnerPayoutAmount = paymentAmount - platformFeeAmount;

  if (booking) {
    const payment = await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        amount: paymentAmount,
        status: 'REQUIRES_CONFIRMATION',
        platformFeeAmount,
        runnerPayoutAmount,
        stripePaymentIntentId: `pi_test_mock_${Date.now()}`
      },
      create: {
        bookingId: booking.id,
        amount: paymentAmount,
        currency: 'gbp',
        status: 'REQUIRES_CONFIRMATION',
        stripePaymentIntentId: `pi_test_mock_${Date.now()}`,
        platformFeeAmount,
        runnerPayoutAmount
      }
    });

    return {
      id: payment.id,
      clientSecret: `${payment.stripePaymentIntentId}_secret_mock`,
      status: payment.status,
      mode: 'test_stub'
    };
  }

  return {
    id: `pi_test_mock_${Date.now()}`,
    clientSecret: `pi_test_mock_${Date.now()}_secret_mock`,
    amount: paymentAmount,
    currency: 'gbp',
    platformFeeAmount,
    runnerPayoutAmount,
    mode: 'test_stub'
  };
};
