import {
  addPhoto,
  deletePhoto,
  getBookingDetail,
  replaceItems,
  updateItemStatus
} from '../services/bookingDetail.service.js';

export const detail = async (req, res, next) => {
  try {
    res.json(await getBookingDetail(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
};

export const putItems = async (req, res, next) => {
  try {
    res.json({ items: await replaceItems(req.user, req.params.id, req.body?.items) });
  } catch (error) {
    next(error);
  }
};

export const patchItem = async (req, res, next) => {
  try {
    res.json({ item: await updateItemStatus(req.user, req.params.id, req.params.itemId, req.body || {}) });
  } catch (error) {
    next(error);
  }
};

export const postPhoto = async (req, res, next) => {
  try {
    res.status(201).json({ photo: await addPhoto(req.user, req.params.id, req.body || {}) });
  } catch (error) {
    next(error);
  }
};

export const removePhoto = async (req, res, next) => {
  try {
    await deletePhoto(req.user, req.params.id, req.params.photoId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
};
