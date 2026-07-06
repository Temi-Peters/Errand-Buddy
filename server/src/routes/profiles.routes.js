import { Router } from 'express';
import { customers, runners, updateCustomer, updateRunner, updateRunnerProfile } from '../controllers/profiles.controller.js';
import { mine, adminList, adminFile } from '../controllers/runnerDocs.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const runnersRouter = Router();
export const customersRouter = Router();

runnersRouter.get('/', requireAuth, runners);
// Verification documents (upload route is registered in app.js before express.json for larger bodies)
runnersRouter.get('/documents/mine', requireAuth, mine);
runnersRouter.get('/documents/:docId/file', requireAuth, requireRole('ADMIN'), adminFile);
runnersRouter.get('/:id/documents', requireAuth, requireRole('ADMIN'), adminList);
runnersRouter.patch('/:id/status', requireAuth, requireRole('ADMIN'), updateRunner);
runnersRouter.patch('/:id', requireAuth, updateRunnerProfile);
customersRouter.get('/', requireAuth, customers);
customersRouter.patch('/:id', requireAuth, updateCustomer);
