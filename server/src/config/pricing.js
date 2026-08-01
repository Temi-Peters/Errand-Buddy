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

// Introductory price for a customer's first one-off errand. Subscriptions are
// excluded — a weekly plan is already a commitment and already discounted, and
// the point of this offer is to remove the risk of trying the service once.
export const FIRST_BOOKING_PRICE = 8;

// Whether a customer has ever had a booking before is decided by the caller; this
// stays a pure function so the pricing rules live in one readable place.
//
// IMPORTANT: the runner is paid on the LIST price, never the discounted one. A
// promotion is the platform's cost of acquiring a customer, and taking it out of
// the runner's payout would mean a volunteer quietly earning less because we ran
// an offer. See platformFee/runnerPayout in bookings.service.js.
export const resolvePricing = (bookingType, subscriptionRaw, { isFirstBooking = false } = {}) => {
  const listPrice = resolveBookingPrice(bookingType, subscriptionRaw);
  if (listPrice == null) return null;

  const eligible = isFirstBooking && bookingType !== 'WEEKLY_SUBSCRIPTION';
  const discount = eligible ? Math.max(0, listPrice - FIRST_BOOKING_PRICE) : 0;

  return {
    listPrice,
    discount,
    chargeAmount: Math.round((listPrice - discount) * 100) / 100
  };
};
