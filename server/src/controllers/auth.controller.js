import { loginUser, registerUser } from '../services/auth.service.js';
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
