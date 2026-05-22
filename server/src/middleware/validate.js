import { ZodError } from 'zod';
import { ApiError } from './errorHandler.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    req.body = parsed.body ?? req.body;
    req.params = parsed.params ?? req.params;
    req.query = parsed.query ?? req.query;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((issue) => issue.message).join('; ');
      next(new ApiError(400, message || 'Invalid request'));
      return;
    }

    next(error);
  }
};
