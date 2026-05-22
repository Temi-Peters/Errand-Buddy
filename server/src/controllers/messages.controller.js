import { createMessage, listMessages } from '../services/messages.service.js';

export const index = async (req, res, next) => {
  try {
    res.json({ messages: await listMessages(req.user, req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json({ message: await createMessage(req.user, req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
};
