import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  constructWebhookEvent,
  createAccountLink,
  createConnectAccount,
  createTransfer,
  retrieveAccount
} from '../services/stripe.service.js';

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Raw body is required — registered before express.json() in app.js

export const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || !env.stripeWebhookSecret) {
    console.warn('[webhook] Missing signature or webhook secret — skipping verification');
    return res.status(400).json({ error: 'Webhook misconfigured' });
  }

  let event;
  try {
    event = constructWebhookEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        // Unhandled event type — acknowledge and move on
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err.message);
    // Still return 200 so Stripe doesn't retry indefinitely for non-recoverable errors
  }

  res.json({ received: true });
};

const handlePaymentSucceeded = async (paymentIntent) => {
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { booking: true }
  });

  if (!payment) {
    console.warn(`[webhook] No payment found for intent ${paymentIntent.id}`);
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED' }
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'PENDING' }
    })
  ]);

  console.log(`[webhook] Booking ${payment.bookingId} confirmed after payment ${paymentIntent.id}`);
};

const handlePaymentFailed = async (paymentIntent) => {
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id }
  });

  if (!payment) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED' }
  });

  console.log(`[webhook] Payment failed for intent ${paymentIntent.id}`);
};

// ─── POST /api/payments/runner/connect ────────────────────────────────────────
// Creates (or refreshes) a Stripe Connect Express onboarding link for a runner

export const runnerConnect = async (req, res, next) => {
  try {
    if (req.user.role !== 'RUNNER' || !req.user.runnerProfile) {
      throw new ApiError(403, 'Only runners can set up payouts');
    }

    const runner = await prisma.runnerProfile.findUnique({
      where: { id: req.user.runnerProfile.id },
      include: { user: true }
    });

    if (!runner) throw new ApiError(404, 'Runner profile not found');

    let stripeAccountId = runner.stripeAccountId;

    // Create a new Connect account if the runner doesn't have one yet
    if (!stripeAccountId) {
      const account = await createConnectAccount({
        email: runner.user.email,
        name: runner.user.name
      });
      stripeAccountId = account.id;

      await prisma.runnerProfile.update({
        where: { id: runner.id },
        data: { stripeAccountId }
      });
    }

    const returnUrl = `${env.clientUrl}/runner/dashboard?connect=success`;
    const refreshUrl = `${env.clientUrl}/runner/dashboard?connect=refresh`;

    const accountLink = await createAccountLink({
      accountId: stripeAccountId,
      returnUrl,
      refreshUrl
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/runner/connect/status ──────────────────────────────────
// Returns the runner's Connect account status

export const runnerConnectStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'RUNNER' || !req.user.runnerProfile) {
      throw new ApiError(403, 'Runners only');
    }

    const runner = await prisma.runnerProfile.findUnique({
      where: { id: req.user.runnerProfile.id }
    });

    if (!runner?.stripeAccountId) {
      return res.json({ connected: false });
    }

    const account = await retrieveAccount(runner.stripeAccountId);

    res.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/runner/transfer ───────────────────────────────────────
// Internal helper — trigger manual payout for a specific booking (admin use)

export const triggerTransfer = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) throw new ApiError(400, 'bookingId is required');

    const payment = await prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: { runner: true }
        }
      }
    });

    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.status !== 'SUCCEEDED') throw new ApiError(400, 'Payment has not succeeded');
    if (payment.stripeTransferId) throw new ApiError(400, 'Transfer already exists');

    const runner = payment.booking.runner;
    if (!runner?.stripeAccountId) throw new ApiError(400, 'Runner has no Stripe account');

    const transfer = await createTransfer({
      amount: Number(payment.runnerPayoutAmount),
      destination: runner.stripeAccountId,
      metadata: { bookingId, paymentId: payment.id }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeTransferId: transfer.id }
    });

    res.json({ transferId: transfer.id });
  } catch (err) {
    next(err);
  }
};
