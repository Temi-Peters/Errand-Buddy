import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { adminRouter } from './routes/admin.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { bookingsRouter } from './routes/bookings.routes.js';
import { customersRouter, runnersRouter } from './routes/profiles.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { handleWebhook } from './controllers/payments.controller.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();

const allowedOrigins = env.clientUrl.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));
app.use(helmet());

// Stripe webhook needs the raw request body — must be registered BEFORE express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', async (req, res) => {
  let database = 'connected';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'unavailable';
  }

  res.json({
    status: 'ok',
    service: 'errand-buddy-api',
    timestamp: new Date().toISOString(),
    database
  });
});

app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/runners', runnersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentsRouter);

app.use(notFound);
app.use(errorHandler);
