import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { notifyAccountRemoved } from './notification.service.js';

const ACTIVE_CUSTOMER_STATUSES = ['PENDING_PAYMENT', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'];
const ACTIVE_RUNNER_STATUSES = ['ASSIGNED', 'IN_PROGRESS'];

// Admin-initiated hard delete. The self-service route in account.service.js is
// password-confirmed and scoped to the caller; this one is the operator's tool for
// removing someone else, so the guards are different: never an admin, never
// yourself, and never someone mid-errand unless you explicitly force it.
export const adminDeleteUser = async (adminUser, targetUserId, { reason = '', force = false } = {}) => {
  if (!targetUserId) throw new ApiError(400, 'User id is required');

  if (targetUserId === adminUser.id) {
    throw new ApiError(400, 'Use your own account settings to delete your account.');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { customerProfile: true, runnerProfile: true }
  });

  if (!target) throw new ApiError(404, 'User not found');

  // Deleting the last admin would lock everyone out of the admin tools, and an
  // admin account should never be removable by another admin without DB access.
  if (target.role === 'ADMIN') {
    throw new ApiError(403, 'Admin accounts cannot be deleted from the dashboard.');
  }

  // Leaving the other party stranded mid-errand is worse than a lingering account,
  // so this needs a deliberate override rather than being the default.
  if (!force) {
    if (target.customerProfile) {
      const active = await prisma.booking.count({
        where: { customerId: target.customerProfile.id, status: { in: ACTIVE_CUSTOMER_STATUSES } }
      });
      if (active > 0) {
        throw new ApiError(409, `This customer has ${active} active booking${active === 1 ? '' : 's'}. Cancel them first, or confirm to delete anyway.`);
      }
    }

    if (target.runnerProfile) {
      const active = await prisma.booking.count({
        where: { runnerId: target.runnerProfile.id, status: { in: ACTIVE_RUNNER_STATUSES } }
      });
      if (active > 0) {
        throw new ApiError(409, `This runner has ${active} task${active === 1 ? '' : 's'} in progress. Reassign them first, or confirm to delete anyway.`);
      }
    }
  }

  const snapshot = { id: target.id, name: target.name, email: target.email, role: target.role };

  // Email before deleting — afterwards the address is gone.
  notifyAccountRemoved(target, reason);

  // Cascades to profile, bookings, payments, reviews, wallet, templates, carer
  // links, claims, messages, push subscriptions and reset tokens.
  await prisma.user.delete({ where: { id: target.id } });

  return { deleted: snapshot };
};
