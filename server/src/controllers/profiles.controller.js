import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { customerToClient, runnerToClient } from '../utils/serializers.js';
import { updateRunnerStatus } from '../services/runners.service.js';

export const runners = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'ADMIN') {
      const profiles = await prisma.runnerProfile.findMany({
        include: { user: true },
        orderBy: { user: { name: 'asc' } }
      });
      return res.json({ runners: profiles.map(runnerToClient) });
    }

    // Non-admins: only the runner's own record, plus runners on the caller's own
    // bookings. Email/phone are redacted on records that aren't the caller's own.
    const ids = new Set();
    if (user.runnerProfile) ids.add(user.runnerProfile.id);

    if (user.role === 'CUSTOMER' && user.customerProfile) {
      const bookings = await prisma.booking.findMany({
        where: {
          runnerId: { not: null },
          OR: [{ customerId: user.customerProfile.id }, { createdByCarerId: user.customerProfile.id }]
        },
        select: { runnerId: true }
      });
      bookings.forEach((b) => b.runnerId && ids.add(b.runnerId));
    }

    const profiles = await prisma.runnerProfile.findMany({
      where: { id: { in: [...ids] } },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });

    const ownId = user.runnerProfile?.id;
    const result = profiles.map((profile) => {
      const dto = runnerToClient(profile);
      if (profile.id !== ownId) {
        delete dto.email;
        delete dto.phone;
      }
      return dto;
    });

    res.json({ runners: result });
  } catch (error) {
    next(error);
  }
};

export const customers = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'ADMIN') {
      const profiles = await prisma.customerProfile.findMany({
        include: { user: true },
        orderBy: { user: { name: 'asc' } }
      });
      return res.json({ customers: profiles.map(customerToClient) });
    }

    // Non-admins only ever need themselves plus the customers on bookings they can
    // see (runners need their assigned/area customers; carers need their clients).
    const ids = new Set();
    if (user.customerProfile) ids.add(user.customerProfile.id);

    let where = null;
    if (user.role === 'RUNNER' && user.runnerProfile?.status === 'ACTIVE') {
      where = {
        OR: [
          { runnerId: user.runnerProfile.id },
          { runnerId: null, status: 'PENDING', postcodeArea: user.runnerProfile.area }
        ]
      };
    } else if (user.role === 'CUSTOMER' && user.customerProfile) {
      where = {
        OR: [{ customerId: user.customerProfile.id }, { createdByCarerId: user.customerProfile.id }]
      };
    }

    if (where) {
      const bookings = await prisma.booking.findMany({ where, select: { customerId: true } });
      bookings.forEach((b) => ids.add(b.customerId));
    }

    const profiles = await prisma.customerProfile.findMany({
      where: { id: { in: [...ids] } },
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });

    res.json({ customers: profiles.map(customerToClient) });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Only the customer themselves (or admin) can update the profile
    if (user.role !== 'ADMIN' && user.customerProfile?.id !== id) {
      throw new ApiError(403, 'You can only update your own profile');
    }

    const profile = await prisma.customerProfile.findUnique({ where: { id }, include: { user: true } });
    if (!profile) throw new ApiError(404, 'Customer not found');

    const { name, email, phone, address, postcodeArea } = req.body;

    // Update user-level fields (name, email) if provided
    if (name || email) {
      const userUpdates = {};
      if (name) userUpdates.name = name.trim();
      if (email) {
        const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: profile.userId } } });
        if (existing) throw new ApiError(409, 'That email is already in use');
        userUpdates.email = email.toLowerCase().trim();
      }
      await prisma.user.update({ where: { id: profile.userId }, data: userUpdates });
    }

    // Update profile-level fields
    const profileUpdates = {};
    if (phone !== undefined) profileUpdates.phone = phone.trim();
    if (address !== undefined) profileUpdates.address = address.trim();
    if (postcodeArea !== undefined) profileUpdates.postcodeArea = postcodeArea.trim();

    const updated = await prisma.customerProfile.update({
      where: { id },
      data: profileUpdates,
      include: { user: true }
    });

    res.json({ customer: customerToClient(updated) });
  } catch (error) {
    next(error);
  }
};

export const updateRunnerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Only the runner themselves can update their own profile
    if (user.role !== 'RUNNER' || user.runnerProfile?.id !== id) {
      throw new ApiError(403, 'You can only update your own profile');
    }

    const profile = await prisma.runnerProfile.findUnique({ where: { id }, include: { user: true } });
    if (!profile) throw new ApiError(404, 'Runner not found');

    const { name, email, phone, area, bio, transportMethod, availabilityNotes } = req.body;

    if (name || email) {
      const userUpdates = {};
      if (name) userUpdates.name = name.trim();
      if (email) {
        const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: profile.userId } } });
        if (existing) throw new ApiError(409, 'That email is already in use');
        userUpdates.email = email.toLowerCase().trim();
      }
      await prisma.user.update({ where: { id: profile.userId }, data: userUpdates });
    }

    const profileUpdates = {};
    if (phone !== undefined) profileUpdates.phone = phone.trim();
    if (area !== undefined) profileUpdates.area = area.trim();
    if (bio !== undefined) profileUpdates.bio = bio.trim();
    if (transportMethod !== undefined) profileUpdates.transportMethod = transportMethod.trim();
    if (availabilityNotes !== undefined) profileUpdates.availabilityNotes = availabilityNotes.trim();

    const updated = await prisma.runnerProfile.update({
      where: { id },
      data: profileUpdates,
      include: { user: true }
    });

    res.json({ runner: runnerToClient(updated) });
  } catch (error) {
    next(error);
  }
};

export const updateRunner = async (req, res, next) => {
  try {
    res.json({ runner: await updateRunnerStatus(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
};
