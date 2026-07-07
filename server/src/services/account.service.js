import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { comparePassword } from '../utils/password.js';

const money = (v) => (v == null ? null : Number(v));
const iso = (d) => (d ? d.toISOString() : null);

// Right of access / portability — a full machine-readable copy of the user's data.
export const exportAccountData = async (user) => {
  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase(),
      createdAt: iso(user.createdAt)
    }
  };

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
    orderBy: { createdAt: 'asc' }
  });
  data.messages = messages.map((m) => ({
    bookingId: m.bookingId,
    direction: m.senderId === user.id ? 'sent' : 'received',
    body: m.body,
    at: iso(m.createdAt)
  }));

  if (user.role === 'CUSTOMER' && user.customerProfile) {
    const p = await prisma.customerProfile.findUnique({
      where: { id: user.customerProfile.id },
      include: {
        bookings: { include: { payment: true, review: true }, orderBy: { createdAt: 'desc' } },
        walletTransactions: { orderBy: { createdAt: 'desc' } },
        bookingTemplates: true,
        claims: true,
        carerLinksAsCarer: { include: { client: { include: { user: true } } } },
        carerLinksAsClient: { include: { carer: { include: { user: true } } } }
      }
    });

    data.profile = { address: p.address, phone: p.phone, postcodeArea: p.postcodeArea, walletBalance: money(p.walletBalance) };
    data.bookings = p.bookings.map((b) => ({
      serviceType: b.serviceType, bookingType: b.bookingType, date: iso(b.date), time: b.time,
      price: money(b.price), status: b.status, address: b.address, instructions: b.instructions,
      goodsCost: money(b.goodsCost), createdAt: iso(b.createdAt),
      payment: b.payment ? { amount: money(b.payment.amount), status: b.payment.status } : null,
      review: b.review ? { stars: b.review.stars, review: b.review.review } : null
    }));
    data.walletTransactions = p.walletTransactions.map((t) => ({ type: t.type, amount: money(t.amount), description: t.description, at: iso(t.createdAt) }));
    data.templates = p.bookingTemplates.map((t) => ({ name: t.name, serviceType: t.serviceType, time: t.time, address: t.address }));
    data.claims = p.claims.map((c) => ({ category: c.category, description: c.description, status: c.status, refundAmount: money(c.refundAmount), createdAt: iso(c.createdAt) }));
    data.carerLinks = [
      ...p.carerLinksAsCarer.map((l) => ({ role: 'carer for', person: l.client?.user?.name, status: l.status })),
      ...p.carerLinksAsClient.map((l) => ({ role: 'cared for by', person: l.carer?.user?.name, status: l.status }))
    ];
  }

  if (user.role === 'RUNNER' && user.runnerProfile) {
    const p = await prisma.runnerProfile.findUnique({
      where: { id: user.runnerProfile.id },
      include: { bookings: { include: { review: true }, orderBy: { createdAt: 'desc' } } }
    });
    data.profile = {
      phone: p.phone, area: p.area, bio: p.bio, transportMethod: p.transportMethod,
      availabilityNotes: p.availabilityNotes, rating: money(p.rating), completedTasks: p.completedTasks, status: p.status
    };
    data.assignedBookings = p.bookings.map((b) => ({
      serviceType: b.serviceType, date: iso(b.date), time: b.time, status: b.status, postcodeArea: b.postcodeArea,
      review: b.review ? { stars: b.review.stars, review: b.review.review } : null
    }));
  }

  return data;
};

// Right to erasure — password-confirmed hard delete (cascades all personal data).
export const deleteAccount = async (user, password) => {
  if (user.role === 'ADMIN') throw new ApiError(403, 'Admin accounts cannot be deleted this way.');
  if (!password) throw new ApiError(400, 'Your password is required to delete your account');

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh || !(await comparePassword(password, fresh.passwordHash))) {
    throw new ApiError(401, 'Incorrect password');
  }

  // Don't allow deletion mid-errand — the other party would be left stranded.
  if (user.role === 'CUSTOMER' && user.customerProfile) {
    const active = await prisma.booking.count({
      where: { customerId: user.customerProfile.id, status: { in: ['PENDING_PAYMENT', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] } }
    });
    if (active > 0) throw new ApiError(409, 'Please complete or cancel your active bookings before deleting your account.');
  }
  if (user.role === 'RUNNER' && user.runnerProfile) {
    const active = await prisma.booking.count({
      where: { runnerId: user.runnerProfile.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } }
    });
    if (active > 0) throw new ApiError(409, 'Please finish your assigned tasks before deleting your account.');
  }

  // Cascades to profile, bookings, payments, reviews, wallet, templates, carer links,
  // claims, messages and push subscriptions via onDelete: Cascade.
  await prisma.user.delete({ where: { id: user.id } });
};
