import {
  acceptBooking,
  completeBooking,
  createBooking,
  listBookings,
  reviewBooking,
  startBooking,
  updateBooking
} from '../services/bookings.service.js';

export const index = async (req, res, next) => {
  try {
    res.json({ bookings: await listBookings(req.user) });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json({ booking: await createBooking(req.user, req.body) });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    res.json({ booking: await updateBooking(req.user, req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
};

export const accept = async (req, res, next) => {
  try {
    res.json({ booking: await acceptBooking(req.user, req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const start = async (req, res, next) => {
  try {
    res.json({ booking: await startBooking(req.user, req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const complete = async (req, res, next) => {
  try {
    res.json({ booking: await completeBooking(req.user, req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const review = async (req, res, next) => {
  try {
    res.status(201).json({ booking: await reviewBooking(req.user, req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
};
