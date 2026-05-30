import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { index, show, create, destroy } from '../controllers/templates.controller.js';

export const templatesRouter = Router();

templatesRouter.use(requireAuth);
templatesRouter.get('/', index);
templatesRouter.get('/:id', show);
templatesRouter.post('/', create);
templatesRouter.delete('/:id', destroy);
