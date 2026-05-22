import { prisma } from '../config/prisma.js';
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

export const updateRunner = async (req, res, next) => {
  try {
    res.json({ runner: await updateRunnerStatus(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
};
