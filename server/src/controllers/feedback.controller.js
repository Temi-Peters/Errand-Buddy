import { ApiError } from '../middleware/errorHandler.js';
import { createResponse, getResults } from '../services/feedback.service.js';

// Public — anyone can submit the value-proposition survey
export const submit = async (req, res, next) => {
  try {
    await createResponse(req.body);
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
};

// Admin only — aggregated results for the survey dashboard
export const results = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') throw new ApiError(403, 'Admins only');
    res.json(await getResults());
  } catch (err) { next(err); }
};
