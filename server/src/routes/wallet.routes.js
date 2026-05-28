import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getWalletBalance, topUp, withdraw } from '../controllers/wallet.controller.js';

export const walletRouter = Router();

walletRouter.get('/', requireAuth, getWalletBalance);
walletRouter.post('/topup', requireAuth, topUp);
walletRouter.post('/withdraw', requireAuth, withdraw);
