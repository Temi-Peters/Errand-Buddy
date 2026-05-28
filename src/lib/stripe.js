import { loadStripe } from '@stripe/stripe-js';

// Singleton — loadStripe is called once and reused across the app
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
