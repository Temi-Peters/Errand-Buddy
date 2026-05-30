import { ApiError } from '../middleware/errorHandler.js';
import { listTemplates, getTemplate, createTemplate, deleteTemplate } from '../services/templates.service.js';

const assertCustomer = (user) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Customers only');
  }
  return user.customerProfile.id;
};

export const index = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    res.json({ templates: await listTemplates(customerId) });
  } catch (err) { next(err); }
};

export const show = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    res.json({ template: await getTemplate(customerId, req.params.id) });
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    res.status(201).json({ template: await createTemplate(customerId, req.body) });
  } catch (err) { next(err); }
};

export const destroy = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    await deleteTemplate(customerId, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};
