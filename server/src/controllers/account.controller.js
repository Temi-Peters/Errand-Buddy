import { exportAccountData, deleteAccount } from '../services/account.service.js';

export const exportData = async (req, res, next) => {
  try {
    res.json(await exportAccountData(req.user));
  } catch (err) { next(err); }
};

export const destroy = async (req, res, next) => {
  try {
    await deleteAccount(req.user, req.body.password);
    res.json({ success: true });
  } catch (err) { next(err); }
};
