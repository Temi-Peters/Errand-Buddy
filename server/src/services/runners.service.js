import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { runnerToClient } from '../utils/serializers.js';
import { notifyRunnerApproved, notifyRunnerRejected } from './notification.service.js';

// Approve / suspend / reactivate. Rejection is a separate destructive action (rejectRunner).
export const updateRunnerStatus = async (runnerId, { status }) => {
  const nextStatus = String(status || '').toUpperCase();
  const allowed = ['PENDING', 'ACTIVE', 'SUSPENDED'];

  if (!allowed.includes(nextStatus)) {
    throw new ApiError(400, 'Runner status must be PENDING, ACTIVE, or SUSPENDED');
  }

  const data = {
    status: nextStatus,
    approvedAt: nextStatus === 'ACTIVE' ? new Date() : undefined,
    suspendedAt: nextStatus === 'SUSPENDED' ? new Date() : null,
    // Approving records that ID was verified; the documents themselves are purged below.
    idVerifiedAt: nextStatus === 'ACTIVE' ? new Date() : undefined
  };

  const runner = await prisma.runnerProfile.update({
    where: { id: runnerId },
    data,
    include: { user: true }
  }).catch(() => {
    throw new ApiError(404, 'Runner not found');
  });

  // Data minimisation: once approved, delete the verification documents.
  if (nextStatus === 'ACTIVE') {
    await prisma.runnerDocument.deleteMany({ where: { runnerId } });
    notifyRunnerApproved(runner.user);
  }

  return runnerToClient(runner);
};

// Rejecting an application deletes it entirely (cascades profile + documents), with the
// option to block the email from re-registering. Notifies the applicant first.
export const rejectRunner = async (runnerId, { reason, blockEmail } = {}) => {
  const runner = await prisma.runnerProfile.findUnique({ where: { id: runnerId }, include: { user: true } });
  if (!runner) throw new ApiError(404, 'Runner not found');

  const cleanReason = (reason && String(reason).trim()) || 'Your application was not approved.';

  notifyRunnerRejected(runner.user, cleanReason);

  if (blockEmail && runner.user?.email) {
    await prisma.blockedEmail.upsert({
      where: { email: runner.user.email },
      update: { reason: cleanReason },
      create: { email: runner.user.email, reason: cleanReason }
    });
  }

  // Delete the whole application — cascades RunnerProfile + RunnerDocument via onDelete: Cascade.
  await prisma.user.delete({ where: { id: runner.userId } });

  return { id: runnerId, deleted: true };
};

export const isEmailBlocked = async (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  const blocked = await prisma.blockedEmail.findUnique({ where: { email: normalized } });
  return Boolean(blocked);
};
