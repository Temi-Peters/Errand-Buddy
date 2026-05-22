import { Router } from 'express';
import { customers, runners, updateCustomer, updateRunner, updateRunnerProfile } from '../controllers/profiles.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const runnersRouter = Router();
export const customersRouter = Router();

runnersRouter.get('/', requireAuth, runners);
runnersRouter.patch('/:id/status', requireAuth, requireRole('ADMIN'), updateRunner);
runnersRouter.patch('/:id', requireAuth, updateRunnerProfile);
customersRouter.get('/', requireAuth, customers);
customersRouter.patch('/:id', requireAuth, updateCustomer);
