import { ApiError } from '../middleware/errorHandler.js';
import { getWallet, initiateTopUp, withdrawFromWallet } from '../services/wallet.service.js';

export const getWalletBalance = async (req, res, next) => {
  try {
    if (req.user.role !== 'CUSTOMER' || !req.user.customerProfile) {
      throw new ApiError(403, 'Customers only');
    }
    const wallet = await getWallet(req.user.customerProfile.id);
    res.json(wallet);
  } catch (err) {
    next(err);
  }
};

export const topUp = async (req, res, next) => {
  try {
    if (req.user.role !== 'CUSTOMER' || !req.user.customerProfile) {
      throw new ApiError(403, 'Customers only');
    }
    const amount = Number(req.body.amount);
    const result = await initiateTopUp(req.user.customerProfile.id, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const withdraw = async (req, res, next) => {
  try {
    if (req.user.role !== 'CUSTOMER' || !req.user.customerProfile) {
      throw new ApiError(403, 'Customers only');
    }
    const amount = Number(req.body.amount);
    const result = await withdrawFromWallet(req.user.customerProfile.id, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
