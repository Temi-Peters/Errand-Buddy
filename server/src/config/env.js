import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  // CLIENT_URL may be a comma-separated list of allowed CORS origins. appUrl is the
  // single canonical public URL (first entry) used for links in emails and Stripe redirects.
  clientUrl: process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  appUrl: (process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim(),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  platformFeePercent: Number(process.env.PLATFORM_FEE_PERCENT || 10),
  // Opt-in, not opt-out: the wallet holds customer money, so it stays off unless
  // someone deliberately turns it on. Set WALLET_ENABLED=true to re-enable.
  walletEnabled: process.env.WALLET_ENABLED === 'true',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM || 'ErrandBuddy <onboarding@resend.dev>',
  contactEmail: process.env.CONTACT_EMAIL || 'temidayo.peters@icloud.com',
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
