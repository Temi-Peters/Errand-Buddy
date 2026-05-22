import { prisma } from '../config/prisma.js';
import { ApiError } from './errorHandler.js';
import { verifyToken } from '../utils/jwt.js';

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.get('authorization') || '';
    const [, token] = header.match(/^Bearer (.+)$/) || [];

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customerProfile: true, runnerProfile: true }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid authentication token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.status ? error : new ApiError(401, 'Invalid authentication token'));
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    next(new ApiError(403, 'You do not have permission to perform this action'));
    return;
  }

  next();
};
