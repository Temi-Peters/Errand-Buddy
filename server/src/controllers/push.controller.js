import { env } from '../config/env.js';
import { saveSubscription, removeSubscription, isPushConfigured } from '../services/push.service.js';

export const publicKey = (req, res) => {
  res.json({ publicKey: env.vapidPublicKey, enabled: isPushConfigured() });
};

export const subscribe = async (req, res, next) => {
  try {
    await saveSubscription(req.user.id, req.body.subscription || req.body);
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
};

export const unsubscribe = async (req, res, next) => {
  try {
    await removeSubscription(req.body.endpoint);
    res.json({ success: true });
  } catch (err) { next(err); }
};
