import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { index, invite, accept, destroy } from '../controllers/carers.controller.js';

export const carersRouter = Router();

carersRouter.use(requireAuth);
carersRouter.get('/', index);
carersRouter.post('/', invite);
carersRouter.post('/:id/accept', accept);
carersRouter.delete('/:id', destroy);
