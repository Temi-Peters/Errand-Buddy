export const roleToClient = (role) => role.toLowerCase();

export const enumToTitle = (value) => value
  .toLowerCase()
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

export const serviceTypeToClient = (value) => enumToTitle(value);

export const serviceTypeFromClient = (value) => {
  const key = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const aliases = {
    DOG_WALKING: 'DOG_WALKING',
    GROCERY_SHOPPING: 'GROCERY_SHOPPING',
    PRESCRIPTION_PICKUP: 'PRESCRIPTION_PICKUP',
    DRY_CLEANING: 'DRY_CLEANING',
    GENERAL_ERRANDS: 'GENERAL_ERRANDS'
  };
  return aliases[key] || null;
};

export const bookingTypeFromClient = (value) => (
  String(value || '').toLowerCase().includes('weekly') ? 'WEEKLY_SUBSCRIPTION' : 'ONE_OFF_TASK'
);

export const bookingTypeToClient = (booking) => {
  if (booking.bookingType === 'WEEKLY_SUBSCRIPTION') {
    return `Weekly subscription - ${booking.subscriptionPlan || '1 task/week'}`;
  }

  return 'One-off task';
};

export const bookingStatusToClient = (status) => enumToTitle(status);

export const bookingStatusFromClient = (status) => {
  const key = String(status || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const allowed = ['PENDING_PAYMENT', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'];
  return allowed.includes(key) ? key : null;
};

export const userToClient = (user) => {
  const profile = user.role === 'CUSTOMER' ? user.customerProfile : user.runnerProfile;

  return {
    id: profile?.id || user.id,
    userId: user.id,
    role: roleToClient(user.role),
    name: user.name,
    email: user.email
  };
};

export const customerToClient = (customer) => ({
  id: customer.id,
  userId: customer.userId,
  name: customer.user.name,
  email: customer.user.email,
  address: customer.address,
  phone: customer.phone,
  postcodeArea: customer.postcodeArea,
  avatarUrl: customer.avatarUrl || null
});

export const runnerToClient = (runner) => ({
  id: runner.id,
  userId: runner.userId,
  name: runner.user.name,
  email: runner.user.email,
  phone: runner.phone,
  area: runner.area,
  bio: runner.bio,
  transportMethod: runner.transportMethod,
  availabilityNotes: runner.availabilityNotes,
  rating: Number(runner.rating),
  completedTasks: runner.completedTasks,
  status: enumToTitle(runner.status),
  approvedAt: runner.approvedAt,
  rejectedAt: runner.rejectedAt,
  rejectionReason: runner.rejectionReason,
  suspendedAt: runner.suspendedAt,
  stripeAccountId: runner.stripeAccountId,
  avatarUrl: runner.avatarUrl || null,
  verified: Boolean(runner.idVerifiedAt),
  // reviewCount drives the "New runner" badge. Showing a fabricated number — 5
  // flatters, 2.5 punishes — is worse than saying there is no data yet, because a
  // low starting score suppresses the very bookings that would earn real reviews.
  reviewCount: runner._count?.reviews ?? null
});

// redactCustomerContact hides the doorstep — full address, contact phone and the
// nested customer record — for viewers who can see that a booking EXISTS without
// being party to it (a runner browsing unassigned jobs in their area). The
// postcode area is kept so they can still judge whether the job is worth taking.
export const bookingToClient = (booking, { redactCustomerContact = false } = {}) => ({
  id: booking.id,
  customerId: booking.customerId,
  runnerId: booking.runnerId,
  serviceType: serviceTypeToClient(booking.serviceType),
  bookingType: bookingTypeToClient(booking),
  date: booking.date.toISOString().slice(0, 10),
  time: booking.time,
  price: Number(booking.price),
  // What was taken off the standard tariff, and what that tariff was — so the
  // client can show "£8, normally £25" without recomputing the pricing rules.
  discountAmount: booking.discountAmount != null ? Number(booking.discountAmount) : null,
  listPrice: Number(booking.price) + (booking.discountAmount != null ? Number(booking.discountAmount) : 0),
  status: bookingStatusToClient(booking.status),
  rating: booking.review ? { stars: booking.review.stars, review: booking.review.review } : null,
  instructions: booking.instructions,
  address: redactCustomerContact ? null : booking.address,
  contactPhone: redactCustomerContact ? null : booking.contactPhone,
  postcodeArea: booking.postcodeArea,
  goodsCost: booking.goodsCost != null ? Number(booking.goodsCost) : null,
  goodsBudget: booking.goodsBudget != null ? Number(booking.goodsBudget) : null,
  substitutionPreference: booking.substitutionPreference || 'ASK_ME_FIRST',
  overageAmount: booking.overageCoveredAmount != null ? Number(booking.overageCoveredAmount) : null,
  overageReason: booking.overageReason || null,
  // Counts only — the actual items and photos are fetched per booking via
  // /bookings/:id/detail so the 45s poll never carries image payloads.
  itemCount: booking._count?.items ?? (booking.items ? booking.items.length : null),
  photoCount: booking._count?.photos ?? (booking.photos ? booking.photos.length : null),
  createdByCarerId: booking.createdByCarerId || null,
  createdByCarer: booking.createdByCarer ? {
    id: booking.createdByCarer.id,
    name: booking.createdByCarer.user?.name,
    email: booking.createdByCarer.user?.email
  } : null,
  customer: booking.customer && !redactCustomerContact ? customerToClient(booking.customer) : undefined,
  runner: booking.runner ? runnerToClient(booking.runner) : undefined,
  payment: booking.payment ? {
    id: booking.payment.id,
    amount: Number(booking.payment.amount),
    currency: booking.payment.currency,
    status: enumToTitle(booking.payment.status),
    platformFeeAmount: Number(booking.payment.platformFeeAmount),
    runnerPayoutAmount: Number(booking.payment.runnerPayoutAmount)
  } : undefined
});

// viewerId is the CustomerProfile id of the requesting user, so the client knows
// which side of the link they're on and who the counterpart is.
export const carerLinkToClient = (link, viewerId) => {
  const viewerIsCarer = link.carerId === viewerId;
  const counterpart = viewerIsCarer ? link.client : link.carer;

  return {
    id: link.id,
    status: enumToTitle(link.status),
    role: viewerIsCarer ? 'carer' : 'client',
    carerId: link.carerId,
    clientId: link.clientId,
    counterpart: counterpart ? {
      id: counterpart.id,
      name: counterpart.user?.name,
      email: counterpart.user?.email
    } : null,
    createdAt: link.createdAt.toISOString()
  };
};

export const claimToClient = (claim) => ({
  id: claim.id,
  bookingId: claim.bookingId,
  category: claim.category,
  description: claim.description,
  status: enumToTitle(claim.status),
  resolutionNote: claim.resolutionNote || null,
  refundAmount: claim.refundAmount != null ? Number(claim.refundAmount) : null,
  createdAt: claim.createdAt.toISOString(),
  resolvedAt: claim.resolvedAt ? claim.resolvedAt.toISOString() : null,
  customer: claim.customer ? { name: claim.customer.user?.name, email: claim.customer.user?.email } : null,
  booking: claim.booking ? {
    serviceType: serviceTypeToClient(claim.booking.serviceType),
    date: claim.booking.date.toISOString().slice(0, 10),
    price: Number(claim.booking.price),
    status: bookingStatusToClient(claim.booking.status)
  } : null
});

export const messageToClient = (message) => ({
  id: message.id,
  bookingId: message.bookingId,
  senderId: message.senderId,
  receiverId: message.receiverId,
  senderName: message.sender?.name,
  receiverName: message.receiver?.name,
  body: message.body,
  createdAt: message.createdAt.toISOString()
});
