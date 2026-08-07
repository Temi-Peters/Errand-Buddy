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
import { walletRouter } from './routes/wallet.routes.js';
import { templatesRouter } from './routes/templates.routes.js';
import { carersRouter } from './routes/carers.routes.js';
import { pushRouter } from './routes/push.routes.js';
import { feedbackRouter } from './routes/feedback.routes.js';
import { contactRouter } from './routes/contact.routes.js';
import { claimsRouter } from './routes/claims.routes.js';
import { accountRouter } from './routes/account.routes.js';
import { handleWebhook } from './controllers/payments.controller.js';
import { upload as uploadRunnerDoc } from './controllers/runnerDocs.controller.js';
import { postPhoto as postBookingPhoto, postSubstitute as postBookingSubstitute } from './controllers/bookingDetail.controller.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();

// Render terminates TLS at a single proxy hop. Without this, req.ip is the proxy's
// address for EVERY request, so the rate limiters below collapse into one global
// bucket shared by all users instead of being per-client.
app.set('trust proxy', 1);

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

// Runner verification uploads need a larger body limit than the default JSON parser
app.post('/api/runners/documents', express.json({ limit: '12mb' }), requireAuth, uploadRunnerDoc);

// Booking photos are client-downscaled data URLs, still larger than the default
// JSON limit. Same pattern as the runner-document upload: its own parser, ahead
// of the global one, so a photo never trips the 100kb default.
app.post('/api/bookings/:id/photos', express.json({ limit: '8mb' }), requireAuth, postBookingPhoto);
// Proposing a substitute carries a photo of the shelf, so it needs the same
// treatment — otherwise the runner's offer trips the default body limit.
app.post('/api/bookings/:id/items/:itemId/substitute', express.json({ limit: '8mb' }), requireAuth, postBookingSubstitute);

app.use(express.json());

// The dashboard polls three endpoints every 45s (see AppContext), so a single
// active user legitimately spends ~60 requests per window before touching
// anything. Several people sharing one NAT — a church hall's wi-fi — share this
// bucket, so the limit is set for that case rather than for a single user.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 1000 : 2000,
  standardHeaders: true,
  legacyHeaders: false
});

// Only failed auth attempts count, so a group signing up together on one network
// can't lock each other out — while brute-forcing a single account still trips.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 50 : 200,
  skipSuccessfulRequests: true,
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
app.use('/api/wallet', walletRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/carers', carersRouter);
app.use('/api/push', pushRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/contact', contactRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/account', accountRouter);

app.use(notFound);
app.use(errorHandler);
