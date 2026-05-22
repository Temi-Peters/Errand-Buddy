import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { messageToClient } from '../utils/serializers.js';
import { notifyNewMessage } from './notification.service.js';

const bookingWithParticipants = {
  customer: { include: { user: true } },
  runner: { include: { user: true } }
};

const canAccessBookingMessages = (user, booking) => (
  user.role === 'ADMIN'
  || booking.customer?.userId === user.id
  || booking.runner?.userId === user.id
);

const getBookingForMessages = async (user, bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithParticipants
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (!canAccessBookingMessages(user, booking)) {
    throw new ApiError(403, 'Only the booking customer, assigned runner, or an admin can access this conversation');
  }

  return booking;
};

export const listMessages = async (user, bookingId) => {
  await getBookingForMessages(user, bookingId);

  const messages = await prisma.message.findMany({
    where: { bookingId },
    include: { sender: true, receiver: true },
    orderBy: { createdAt: 'asc' }
  });

  return messages.map(messageToClient);
};

export const createMessage = async (user, bookingId, data) => {
  const booking = await getBookingForMessages(user, bookingId);
  const body = String(data.body || '').trim();

  if (!body) {
    throw new ApiError(400, 'Message body is required');
  }

  if (!booking.runnerId && user.role !== 'ADMIN') {
    throw new ApiError(409, 'A runner must be assigned before messaging can start');
  }

  let receiverId = data.receiverId;

  if (!receiverId) {
    if (user.role === 'CUSTOMER') {
      receiverId = booking.runner?.userId;
    } else if (user.role === 'RUNNER') {
      receiverId = booking.customer.userId;
    } else {
      receiverId = booking.customer.userId;
    }
  }

  const allowedReceiverIds = [booking.customer.userId, booking.runner?.userId].filter(Boolean);
  if (!allowedReceiverIds.includes(receiverId) || receiverId === user.id) {
    throw new ApiError(400, 'Valid booking participant receiver is required');
  }

  const message = await prisma.message.create({
    data: {
      bookingId,
      senderId: user.id,
      receiverId,
      body
    },
    include: { sender: true, receiver: true }
  });

  notifyNewMessage(message);

  return messageToClient(message);
};
