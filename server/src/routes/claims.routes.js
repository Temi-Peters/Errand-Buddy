import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createClaimSchema, resolveClaimSchema } from '../utils/validationSchemas.js';
import { index, create, resolve , reply, thread } from '../controllers/claims.controller.js';

export const claimsRouter = Router();

claimsRouter.use(requireAuth);
claimsRouter.get('/', index);
claimsRouter.post('/', validate(createClaimSchema), create);
claimsRouter.post('/:id/resolve', requireRole('ADMIN'), validate(resolveClaimSchema), resolve);
claimsRouter.get('/:id/thread', requireAuth, thread);
claimsRouter.post('/:id/messages', requireAuth, reply);
