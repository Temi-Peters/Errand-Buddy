import { Router } from 'express';
import { deleteUser, overview } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adminDeleteUserSchema } from '../utils/validationSchemas.js';

export const adminRouter = Router();

adminRouter.get('/overview', requireAuth, requireRole('ADMIN'), overview);
adminRouter.delete('/users/:id', requireAuth, requireRole('ADMIN'), validate(adminDeleteUserSchema), deleteUser);
