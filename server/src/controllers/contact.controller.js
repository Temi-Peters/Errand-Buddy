import { createContactMessage } from '../services/contact.service.js';

// Public — anyone can send a contact message
export const submit = async (req, res, next) => {
  try {
    await createContactMessage(req.body);
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
};
