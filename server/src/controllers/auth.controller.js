import { loginUser, registerUser } from '../services/auth.service.js';
import { requestPasswordReset, resetPassword as resetPasswordService } from '../services/passwordReset.service.js';
import { userToClient } from '../utils/serializers.js';

export const register = async (req, res, next) => {
  try {
    res.status(201).json(await registerUser(req.body));
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    res.json(await loginUser(req.body));
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res) => {
  res.json({ user: userToClient(req.user) });
};

export const forgotPassword = async (req, res, next) => {
  try {
    await requestPasswordReset(req.body.email);
    // Deliberately identical whether or not the account exists.
    res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await resetPasswordService(req.body.token, req.body.password);
    res.json({ message: 'Your password has been reset. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
