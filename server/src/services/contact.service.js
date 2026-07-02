import { prisma } from '../config/prisma.js';
import { notifyContactReceived } from './notification.service.js';

export const createContactMessage = async (data) => {
  const record = await prisma.contactMessage.create({
    data: {
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      message: String(data.message).trim()
    }
  });

  // Fire-and-forget email to the team inbox
  notifyContactReceived(record);

  return record;
};
