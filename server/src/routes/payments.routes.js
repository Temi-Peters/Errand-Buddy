import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  runnerConnect,
  runnerConnectStatus,
  triggerTransfer
} from '../controllers/payments.controller.js';

export const paymentsRouter = Router();

// NOTE: /webhook is registered directly in app.js before express.json() — do not add it here

paymentsRouter.post('/runner/connect', requireAuth, runnerConnect);
paymentsRouter.get('/runner/connect/status', requireAuth, runnerConnectStatus);
paymentsRouter.post('/runner/transfer', requireAuth, triggerTransfer);
