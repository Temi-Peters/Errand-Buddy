import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { feedbackSchema } from '../utils/validationSchemas.js';
import { submit, results } from '../controllers/feedback.controller.js';

export const feedbackRouter = Router();

feedbackRouter.post('/', validate(feedbackSchema), submit);
feedbackRouter.get('/', requireAuth, results);
