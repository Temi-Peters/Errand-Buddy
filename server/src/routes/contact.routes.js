import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { contactSchema } from '../utils/validationSchemas.js';
import { submit } from '../controllers/contact.controller.js';

export const contactRouter = Router();

contactRouter.post('/', validate(contactSchema), submit);
