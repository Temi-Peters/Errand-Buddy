import { Router } from 'express';
import {
  accept,
  complete,
  create,
  index,
  review,
  start,
  update
} from '../controllers/bookings.controller.js';
import { create as createMessage, index as listMessages } from '../controllers/messages.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookingIdSchema,
  createBookingSchema,
  messageSchema,
  reviewSchema,
  updateBookingSchema
} from '../utils/validationSchemas.js';

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth);
bookingsRouter.get('/', index);
bookingsRouter.post('/', validate(createBookingSchema), create);
bookingsRouter.get('/:id/messages', validate(bookingIdSchema), listMessages);
bookingsRouter.post('/:id/messages', validate(messageSchema), createMessage);
bookingsRouter.patch('/:id', validate(updateBookingSchema), update);
bookingsRouter.post('/:id/accept', validate(bookingIdSchema), accept);
bookingsRouter.post('/:id/start', validate(bookingIdSchema), start);
bookingsRouter.post('/:id/complete', validate(bookingIdSchema), complete);
bookingsRouter.post('/:id/review', validate(reviewSchema), review);
