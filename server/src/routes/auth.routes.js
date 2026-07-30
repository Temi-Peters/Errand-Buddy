import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { forgotPassword, login, me, register, resetPassword } from '../controllers/auth.controller.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from '../utils/validationSchemas.js';

export const authRouter = Router();

// Forgot-password always returns 200 (it must not reveal whether an account
// exists), so the shared auth limiter — which only counts failures — would never
// catch it. Without its own cap this endpoint is an email-bombing tool.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reset requests. Please try again later.' }
});

authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRouter.get('/me', requireAuth, me);
