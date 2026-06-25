import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (user) => jwt.sign(
  { sub: user.id, role: user.role },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' }
);

// Pin the algorithm so a token can't be presented under a different/weaker alg.
export const verifyToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
