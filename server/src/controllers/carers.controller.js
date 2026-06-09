import { ApiError } from '../middleware/errorHandler.js';
import { listLinks, inviteCarer, acceptInvite, removeLink } from '../services/carers.service.js';

const assertCustomer = (user) => {
  if (user.role !== 'CUSTOMER' || !user.customerProfile) {
    throw new ApiError(403, 'Customers only');
  }
  return user.customerProfile.id;
};

export const index = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    res.json(await listLinks(customerId));
  } catch (err) { next(err); }
};

export const invite = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    res.status(201).json({ link: await inviteCarer(customerId, req.body.email) });
  } catch (err) { next(err); }
};

export const accept = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    res.json({ link: await acceptInvite(customerId, req.params.id) });
  } catch (err) { next(err); }
};

export const destroy = async (req, res, next) => {
  try {
    const customerId = assertCustomer(req.user);
    await removeLink(customerId, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};
