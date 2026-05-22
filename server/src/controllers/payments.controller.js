import { createMockPaymentIntent } from '../services/payments.service.js';

export const mockIntent = async (req, res, next) => {
  try {
    res.status(201).json({ paymentIntent: await createMockPaymentIntent(req.body) });
  } catch (error) {
    next(error);
  }
};
