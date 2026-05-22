import { Router } from 'express';
import { customers, runners, updateRunner } from '../controllers/profiles.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const runnersRouter = Router();
export const customersRouter = Router();

runnersRouter.get('/', requireAuth, runners);
runnersRouter.patch('/:id', requireAuth, requireRole('ADMIN'), updateRunner);
customersRouter.get('/', requireAuth, customers);
