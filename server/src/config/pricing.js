// Single source of truth for booking prices (£). The server ALWAYS derives the
// price from the booking tier — a client-supplied amount is never trusted, so a
// customer cannot pay an arbitrary price for a booking.

export const ONE_OFF_PRICE = 25;

export const SUBSCRIPTION_PRICES = {
  '1 task/week': 20,
  '2 tasks/week': 38,
  '3 tasks/week': 54
};

// Normalize any subscription string ('Weekly subscription - 2 tasks/week',
// '2 tasks/week', '2/week', bare '2', etc.) to a canonical tier key, or null.
export const normalizeSubscriptionTier = (raw) => {
  const text = String(raw || '');
  const match = text.match(/([1-3])\s*tasks?\s*\/?\s*week/i) || text.match(/\b([1-3])\b/);
  if (!match) return null;
  const n = match[1];
  return n === '1' ? '1 task/week' : `${n} tasks/week`;
};

// Returns the canonical price for a booking, or null if it can't be determined
// (unknown subscription tier) so the caller can reject rather than mischarge.
export const resolveBookingPrice = (bookingType, subscriptionRaw) => {
  if (bookingType === 'WEEKLY_SUBSCRIPTION') {
    const tier = normalizeSubscriptionTier(subscriptionRaw);
    return tier ? SUBSCRIPTION_PRICES[tier] : null;
  }
  return ONE_OFF_PRICE;
};
