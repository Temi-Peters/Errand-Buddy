import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  platformFeePercent: Number(process.env.PLATFORM_FEE_PERCENT || 10),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM || 'ErrandBuddy <onboarding@resend.dev>',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:hello@errandbuddy.co.uk'
};

// Fail fast in production rather than silently signing tokens with a known/weak
// secret. A missing or default JWT secret means anyone can forge tokens.
if (env.nodeEnv === 'production') {
  const secret = process.env.JWT_SECRET || '';
  if (!secret || secret === 'dev-only-change-me' || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a strong secret (>= 32 chars) in production');
  }
}
