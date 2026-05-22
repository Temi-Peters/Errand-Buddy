import { Router } from 'express';
import { mockIntent } from '../controllers/payments.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const paymentsRouter = Router();

paymentsRouter.post('/mock-intent', requireAuth, mockIntent);
