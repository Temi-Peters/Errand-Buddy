import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { notifyPasswordReset, notifyPasswordChanged } from './notification.service.js';

const TOKEN_TTL_MINUTES = 60;

// The raw token goes in the emailed link; only its hash is ever stored, so read
// access to the table doesn't let anyone take over an account.
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

export const requestPasswordReset = async (emailRaw) => {
  const email = String(emailRaw || '').trim().toLowerCase();
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return the same result whether or not the account exists — otherwise
  // this endpoint becomes a way to test which church members are registered.
  if (!user) return;

  // Any earlier link the user requested stops working the moment a new one is
  // issued, so a forwarded or shoulder-surfed old email is dead.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)
    }
  });

  const resetUrl = `${env.appUrl}/reset-password?token=${rawToken}`;
  notifyPasswordReset(user, resetUrl, TOKEN_TTL_MINUTES);
};

export const resetPassword = async (rawToken, newPassword) => {
  const token = String(rawToken || '').trim();
  const password = String(newPassword || '');

  if (!token) throw new ApiError(400, 'Reset token is required');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  // One message for missing, used and expired alike — nothing to learn from probing.
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.');
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      // passwordChangedAt invalidates any token issued before now (see requireAuth),
      // so an attacker already signed in is kicked out by the reset.
      data: { passwordHash, passwordChangedAt: new Date() }
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
    // Burn every other outstanding link for this account too.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } }
    })
  ]);

  // Tells the real owner if someone else completed a reset on their account.
  notifyPasswordChanged(record.user);
};
