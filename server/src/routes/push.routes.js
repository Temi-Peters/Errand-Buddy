import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { publicKey, subscribe, unsubscribe } from '../controllers/push.controller.js';

export const pushRouter = Router();

pushRouter.get('/public-key', publicKey);
pushRouter.post('/subscribe', requireAuth, subscribe);
pushRouter.post('/unsubscribe', requireAuth, unsubscribe);
