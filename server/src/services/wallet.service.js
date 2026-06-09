import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { createPaymentIntent } from './stripe.service.js';
import { notifyWalletLow } from './notification.service.js';

const LOW_BALANCE_THRESHOLD = 10;

export const getWallet = async (customerId) => {
  const profile = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    select: {
      walletBalance: true,
      walletTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }
  });

  if (!profile) throw new ApiError(404, 'Customer profile not found');

  return {
    balance: Number(profile.walletBalance),
    transactions: profile.walletTransactions.map(txToClient)
  };
};

export const initiateTopUp = async (customerId, amount) => {
  if (!amount || amount < 1) throw new ApiError(400, 'Minimum top-up is £1');
  if (amount > 500) throw new ApiError(400, 'Maximum top-up is £500');

  const intent = await createPaymentIntent({
    amount,
    currency: 'gbp',
    metadata: { type: 'wallet_topup', customerId }
  });

  return { clientSecret: intent.client_secret, amount };
};

export const creditWallet = async (customerId, amountPounds, stripePaymentIntentId) => {
  const [, tx] = await prisma.$transaction([
    prisma.customerProfile.update({
      where: { id: customerId },
      data: { walletBalance: { increment: amountPounds } }
    }),
    prisma.walletTransaction.create({
      data: {
        customerId,
        type: 'DEPOSIT',
        amount: amountPounds,
        description: 'Wallet top-up',
        stripePaymentIntentId
      }
    })
  ]);

  return txToClient(tx);
};

export const withdrawFromWallet = async (customerId, amount) => {
  if (!amount || amount <= 0) throw new ApiError(400, 'Amount must be greater than 0');

  const profile = await prisma.customerProfile.findUnique({
    where: { id: customerId },
    select: { walletBalance: true }
  });

  if (!profile) throw new ApiError(404, 'Customer profile not found');

  const balance = Number(profile.walletBalance);
  if (amount > balance) throw new ApiError(400, `Insufficient balance (£${balance.toFixed(2)} available)`);

  const [updated, tx] = await prisma.$transaction([
    prisma.customerProfile.update({
      where: { id: customerId },
      data: { walletBalance: { decrement: amount } }
    }),
    prisma.walletTransaction.create({
      data: {
        customerId,
        type: 'WITHDRAWAL',
        amount,
        description: 'Withdrawal request'
      }
    })
  ]);

  const newBalance = Number(updated.walletBalance);

  if (newBalance < LOW_BALANCE_THRESHOLD) {
    const user = await prisma.user.findFirst({ where: { customerProfile: { id: customerId } } });
    if (user) notifyWalletLow(user, newBalance);
  }

  return {
    newBalance,
    transaction: txToClient(tx)
  };
};

// Debit a customer's wallet for the cost of goods a runner purchased on a booking.
// The balance is allowed to go negative (overdraft); the existing low-balance email
// fires so the payer knows to top up. Used by the booking completion flow.
export const chargeForGoods = async (customerId, amount, bookingId, description) => {
  if (!amount || amount <= 0) throw new ApiError(400, 'Goods cost must be greater than 0');

  const [updated, tx] = await prisma.$transaction([
    prisma.customerProfile.update({
      where: { id: customerId },
      data: { walletBalance: { decrement: amount } }
    }),
    prisma.walletTransaction.create({
      data: {
        customerId,
        type: 'CHARGE',
        amount,
        description: description || 'Cost of goods',
        bookingId
      }
    })
  ]);

  const newBalance = Number(updated.walletBalance);

  if (newBalance < LOW_BALANCE_THRESHOLD) {
    const user = await prisma.user.findFirst({ where: { customerProfile: { id: customerId } } });
    if (user) notifyWalletLow(user, newBalance);
  }

  return { newBalance, transaction: txToClient(tx) };
};

const txToClient = (tx) => ({
  id: tx.id,
  type: tx.type.toLowerCase(),
  amount: Number(tx.amount),
  description: tx.description,
  bookingId: tx.bookingId || null,
  createdAt: tx.createdAt.toISOString()
});
