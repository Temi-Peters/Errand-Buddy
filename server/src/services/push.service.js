import webpush from 'web-push';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const configured = Boolean(env.vapidPublicKey && env.vapidPrivateKey);

if (configured) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
} else {
  console.warn('[push] VAPID keys not configured — push notifications disabled');
}

export const isPushConfigured = () => configured;

export const saveSubscription = async (userId, subscription) => {
  const { endpoint, keys } = subscription || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    const err = new Error('Invalid push subscription');
    err.status = 400;
    throw err;
  }

  // Upsert by endpoint (unique) — re-subscribing or switching users updates the row
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }
  });
};

export const removeSubscription = async (endpoint) => {
  if (!endpoint) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
};

// Fire-and-forget: send a push to every device a user has registered. Dead
// subscriptions (410 Gone / 404) are pruned. Never throws — mirrors the
// fire-and-forget contract of the email notifications.
export const sendPushToUser = async (userId, { title, body, url, tag } = {}) => {
  if (!configured || !userId) return;

  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;

    const payload = JSON.stringify({ title, body, url: url || '/', tag });

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[push] send failed for ${sub.id}:`, err.message);
        }
      }
    }));
  } catch (err) {
    console.error('[push] sendPushToUser error:', err.message);
  }
};
