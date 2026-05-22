import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { runnerToClient } from '../utils/serializers.js';
import { notifyRunnerApproved, notifyRunnerRejected } from './notification.service.js';

export const updateRunnerStatus = async (runnerId, { status, rejectionReason }) => {
  const nextStatus = String(status || '').toUpperCase();
  const allowed = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'];

  if (!allowed.includes(nextStatus)) {
    throw new ApiError(400, 'Runner status must be PENDING, ACTIVE, REJECTED, or SUSPENDED');
  }

  const data = {
    status: nextStatus,
    approvedAt: nextStatus === 'ACTIVE' ? new Date() : undefined,
    rejectedAt: nextStatus === 'REJECTED' ? new Date() : undefined,
    rejectionReason: nextStatus === 'REJECTED' ? (rejectionReason || 'Application was not approved.') : null,
    suspendedAt: nextStatus === 'SUSPENDED' ? new Date() : null
  };

  const runner = await prisma.runnerProfile.update({
    where: { id: runnerId },
    data,
    include: { user: true }
  }).catch(() => {
    throw new ApiError(404, 'Runner not found');
  });

  if (nextStatus === 'ACTIVE') notifyRunnerApproved(runner.user);
  if (nextStatus === 'REJECTED') notifyRunnerRejected(runner.user, data.rejectionReason);

  return runnerToClient(runner);
};
