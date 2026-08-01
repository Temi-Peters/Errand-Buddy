import { Router } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { getWalletBalance, topUp, withdraw } from '../controllers/wallet.controller.js';

export const walletRouter = Router();

// Taking money into a stored balance is the regulated part of the platform, and
// it is switched OFF unless WALLET_ENABLED is explicitly set. Hiding the buttons
// in the client is not enough — these routes are reachable directly.
// Reading the balance stays open so existing balances remain visible.
const requireWalletEnabled = (req, res, next) => {
  if (!env.walletEnabled) {
    next(new ApiError(503, 'Wallet top-ups and withdrawals are temporarily unavailable.'));
    return;
  }
  next();
};

walletRouter.get('/', requireAuth, getWalletBalance);
walletRouter.post('/topup', requireAuth, requireWalletEnabled, topUp);
walletRouter.post('/withdraw', requireAuth, requireWalletEnabled, withdraw);
