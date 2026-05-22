import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { userToClient } from '../utils/serializers.js';
import { notifyRunnerApplicationSubmitted } from './notification.service.js';

const includeProfiles = { customerProfile: true, runnerProfile: true };

export const registerUser = async (data) => {
  const role = String(data.role || 'customer').toUpperCase();
  const allowedRoles = ['CUSTOMER', 'RUNNER', 'ADMIN'];

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, 'Role must be CUSTOMER, RUNNER, or ADMIN');
  }

  if (!data.name || !data.email || !data.password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role,
      customerProfile: role === 'CUSTOMER' ? {
        create: {
          address: data.address || '',
          phone: data.phone || '',
          postcodeArea: data.postcodeArea || 'Oadby'
        }
      } : undefined,
      runnerProfile: role === 'RUNNER' ? {
        create: {
          phone: data.phone || '',
          area: data.area || data.postcodeArea || 'Oadby',
          bio: data.bio || '',
          transportMethod: data.transportMethod || '',
          availabilityNotes: data.availabilityNotes || '',
          rating: 0,
          completedTasks: 0,
          status: 'PENDING'
        }
      } : undefined
    },
    include: includeProfiles
  });

  if (user.runnerProfile) {
    notifyRunnerApplicationSubmitted(user);
  }

  return { token: signToken(user), user: userToClient(user) };
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: includeProfiles
  });

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return { token: signToken(user), user: userToClient(user) };
};
