import { env } from '../config/env.js';

const logNotification = (event, payload) => {
  if (env.nodeEnv !== 'development') return;
  console.log(JSON.stringify({ event, channel: 'notification_stub', ...payload }));
};

export const notifyBookingAssigned = (booking) => logNotification('booking.assigned', {
  bookingId: booking.id,
  customerId: booking.customerId,
  runnerId: booking.runnerId
});

export const notifyBookingCreated = (booking) => logNotification('booking.created', {
  bookingId: booking.id,
  customerId: booking.customerId,
  status: booking.status
});

export const notifyRunnerApplicationSubmitted = (runner) => logNotification('runner.application.submitted', {
  runnerId: runner.id,
  userId: runner.userId,
  area: runner.area
});

export const notifyRunnerApproved = (runner) => logNotification('runner.approved', {
  runnerId: runner.id,
  userId: runner.userId
});

export const notifyRunnerRejected = (runner) => logNotification('runner.rejected', {
  runnerId: runner.id,
  userId: runner.userId,
  reason: runner.rejectionReason
});

export const notifyTaskStarted = (booking) => logNotification('booking.started', {
  bookingId: booking.id,
  customerId: booking.customerId,
  runnerId: booking.runnerId
});

export const notifyTaskCompleted = (booking) => logNotification('booking.completed', {
  bookingId: booking.id,
  customerId: booking.customerId,
  runnerId: booking.runnerId
});

export const notifyNewMessage = (message) => logNotification('message.created', {
  bookingId: message.bookingId,
  senderId: message.senderId,
  receiverId: message.receiverId
});

export const notifyReviewSubmitted = (review) => logNotification('review.submitted', {
  bookingId: review.bookingId,
  customerId: review.customerId,
  runnerId: review.runnerId,
  stars: review.stars
});
