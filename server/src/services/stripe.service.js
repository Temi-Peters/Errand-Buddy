import Stripe from 'stripe';
import { env } from '../config/env.js';

// Initialised lazily so missing key doesn't crash the server on startup
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    if (!env.stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(env.stripeSecretKey);
  }
  return _stripe;
};

// ─── Payment Intents ──────────────────────────────────────────────────────────

export const createPaymentIntent = async ({ amount, currency = 'gbp', metadata = {} }) => {
  return getStripe().paymentIntents.create({
    amount: Math.round(amount * 100), // stripe works in pence
    currency,
    metadata,
    automatic_payment_methods: { enabled: true }
  });
};

export const retrievePaymentIntent = async (id) => {
  return getStripe().paymentIntents.retrieve(id);
};

export const updatePaymentIntentMetadata = async (id, metadata) => {
  return getStripe().paymentIntents.update(id, { metadata });
};

// ─── Transfers (runner payouts) ───────────────────────────────────────────────

export const createTransfer = async ({ amount, destination, metadata = {} }) => {
  return getStripe().transfers.create({
    amount: Math.round(amount * 100),
    currency: 'gbp',
    destination,
    metadata
  });
};

// ─── Connect (runner onboarding) ──────────────────────────────────────────────

export const createConnectAccount = async ({ email, name }) => {
  return getStripe().accounts.create({
    type: 'express',
    country: 'GB',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    business_profile: { name }
  });
};

export const createAccountLink = async ({ accountId, returnUrl, refreshUrl }) => {
  return getStripe().accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding'
  });
};

export const retrieveAccount = async (accountId) => {
  return getStripe().accounts.retrieve(accountId);
};

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const constructWebhookEvent = (payload, signature, secret) => {
  return getStripe().webhooks.constructEvent(payload, signature, secret);
};
