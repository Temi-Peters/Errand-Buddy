import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { customerToClient, runnerToClient } from '../utils/serializers.js';
import { updateRunnerStatus } from '../services/runners.service.js';

export const runners = async (req, res, next) => {
  try {
    const profiles = await prisma.runnerProfile.findMany({
      include: { user: true },
      orderBy: { user: { name: 'asc' } }
    });

    res.json({ runners: profiles.map(runnerToClient) });
  } catch (error) {
    next(error);
  }
};

export const customers = async (req, res, next) => {
  try {
    const profiles = await prisma.customerProfile.findMany({
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
