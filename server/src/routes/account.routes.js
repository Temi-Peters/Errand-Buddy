import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { exportData, destroy } from '../controllers/account.controller.js';

export const accountRouter = Router();

accountRouter.use(requireAuth);
accountRouter.get('/export', exportData);
accountRouter.delete('/', destroy);
