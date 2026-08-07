import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { notifySubstituteDecided, notifySubstituteProposed } from './notification.service.js';

// Shopping-list items and photos for a booking. Kept out of bookings.service so
// the booking list — polled every 45s — never carries image payloads; the list
// DTO only reports counts, and this is fetched on demand for one booking.

const MAX_ITEMS = 60;
const MAX_PHOTOS_PER_KIND = 6;
// A client-downscaled JPEG data URL. ~1.4MB of base64 is roughly a 1MB image,
// which is far more than a downscaled photo needs — this is a backstop against a
// client that skips resizing, not the expected size.
const MAX_DATA_URL_CHARS = 1_400_000;
const ALLOWED_PREFIXES = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'];

// Who may see or touch a booking's detail. Deliberately the same rule as the
// message thread: the customer, the carer who placed it, the assigned runner, or
// an admin. A runner browsing the open queue is NOT included — they can see a
// job exists without seeing the customer's photos.
const loadBooking = async (user, bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, runner: true }
  });
  if (!booking) throw new ApiError(404, 'Booking not found');

  const isCustomer = user.customerProfile
    && (booking.customerId === user.customerProfile.id || booking.createdByCarerId === user.customerProfile.id);
  const isRunner = user.runnerProfile && booking.runnerId === user.runnerProfile.id;

  if (user.role !== 'ADMIN' && !isCustomer && !isRunner) {
    throw new ApiError(403, 'You do not have access to this booking');
  }

  return { booking, isCustomer, isRunner };
};

export const itemToClient = (item, photos = []) => ({
  id: item.id,
  position: item.position,
  name: item.name,
  quantity: item.quantity || '',
  backupName: item.backupName || null,
  status: item.status,
  proposedSubstitute: item.proposedSubstitute || null,
  proposedAt: item.proposedAt ? item.proposedAt.toISOString() : null,
  substitutedWith: item.substitutedWith || null,
  // A picture of what's actually on the shelf. Far more use to someone who can't
  // picture an alternative from a product name.
  substitutePhoto: photos.find((p) => p.itemId === item.id && p.kind === 'SUBSTITUTE')?.dataUrl || null
});

export const photoToClient = (photo) => ({
  id: photo.id,
  kind: photo.kind,
  dataUrl: photo.dataUrl,
  caption: photo.caption || null,
  createdAt: photo.createdAt.toISOString()
});

export const getBookingDetail = async (user, bookingId) => {
  await loadBooking(user, bookingId);

  const [items, photos] = await Promise.all([
    prisma.bookingItem.findMany({ where: { bookingId }, orderBy: { position: 'asc' } }),
    prisma.bookingPhoto.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } })
  ]);

  return { items: items.map((item) => itemToClient(item, photos)), photos: photos.map(photoToClient) };
};

// Replaces the whole list. Only the customer side edits it, and only while the
// errand hasn't been done — rewriting the list after a runner has shopped would
// destroy the record of what they were actually asked for.
export const replaceItems = async (user, bookingId, items) => {
  const { booking, isCustomer } = await loadBooking(user, bookingId);
  if (!isCustomer && user.role !== 'ADMIN') throw new ApiError(403, 'Only the customer can change the shopping list');
  if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
    throw new ApiError(409, 'This errand is finished — the list can no longer be changed.');
  }
  if (!Array.isArray(items)) throw new ApiError(400, 'Items must be a list');
  if (items.length > MAX_ITEMS) throw new ApiError(400, `A list can have at most ${MAX_ITEMS} items`);

  const clean = items
    .map((item, index) => ({
      bookingId,
      position: index,
      name: String(item?.name || '').trim().slice(0, 200),
      quantity: String(item?.quantity || '').trim().slice(0, 40),
      backupName: String(item?.backupName || '').trim().slice(0, 200) || null
    }))
    .filter((item) => item.name);

  await prisma.$transaction([
    prisma.bookingItem.deleteMany({ where: { bookingId } }),
    ...(clean.length ? [prisma.bookingItem.createMany({ data: clean })] : [])
  ]);

  const saved = await prisma.bookingItem.findMany({ where: { bookingId }, orderBy: { position: 'asc' } });
  // Wrapped, not passed by reference: Array.map hands the index as the second
  // argument, which itemToClient would read as the photos array.
  return saved.map((item) => itemToClient(item));
};

// The runner marking off what happened to one item. This is the whole point of
// structuring the list: "they didn't have it" becomes a recorded outcome the
// customer can see, rather than something said on the phone and forgotten.
export const updateItemStatus = async (user, bookingId, itemId, { status, substitutedWith }) => {
  const { isRunner } = await loadBooking(user, bookingId);
  if (!isRunner && user.role !== 'ADMIN') throw new ApiError(403, 'Only the assigned runner can update items');

  const item = await prisma.bookingItem.findUnique({ where: { id: itemId } });
  if (!item || item.bookingId !== bookingId) throw new ApiError(404, 'Item not found on this booking');

  const updated = await prisma.bookingItem.update({
    where: { id: itemId },
    data: {
      status,
      // Only a substitution carries a replacement name; clear it otherwise so a
      // corrected status can't leave a stale "bought instead" hanging around.
      substitutedWith: status === 'SUBSTITUTED' ? String(substitutedWith || '').trim().slice(0, 200) || null : null,
      // Moving away from AWAITING_APPROVAL retires the pending offer.
      ...(status === 'AWAITING_APPROVAL' ? {} : { proposedSubstitute: null, proposedAt: null })
    }
  });

  return itemToClient(updated);
};

// The runner, standing in the aisle, offers a replacement. The customer is
// pushed a notification with the photo and answers yes or no — which is the
// whole point: an alternative is far easier to judge from a picture than a name.
export const proposeSubstitute = async (user, bookingId, itemId, { name, dataUrl }) => {
  const { booking, isRunner } = await loadBooking(user, bookingId);
  if (!isRunner && user.role !== 'ADMIN') throw new ApiError(403, 'Only the assigned runner can suggest a replacement');

  const item = await prisma.bookingItem.findUnique({ where: { id: itemId } });
  if (!item || item.bookingId !== bookingId) throw new ApiError(404, 'Item not found on this booking');

  const proposed = String(name || '').trim().slice(0, 200);
  if (!proposed) throw new ApiError(400, 'Say what you would get instead');

  if (dataUrl) {
    const url = String(dataUrl);
    if (!ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      throw new ApiError(400, 'Photo must be a JPEG, PNG or WebP image');
    }
    if (url.length > MAX_DATA_URL_CHARS) throw new ApiError(400, 'That image is too large — please try a smaller photo');
    // One picture per item: a new offer replaces the last.
    await prisma.bookingPhoto.deleteMany({ where: { bookingId, itemId, kind: 'SUBSTITUTE' } });
    await prisma.bookingPhoto.create({
      data: { bookingId, itemId, kind: 'SUBSTITUTE', dataUrl: url, uploadedById: user.id }
    });
  }

  const updated = await prisma.bookingItem.update({
    where: { id: itemId },
    data: { status: 'AWAITING_APPROVAL', proposedSubstitute: proposed, proposedAt: new Date(), substitutedWith: null }
  });

  const full = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: { include: { user: true } }, createdByCarer: { include: { user: true } } }
  });
  notifySubstituteProposed(full, { itemName: item.name, proposed });

  const photos = await prisma.bookingPhoto.findMany({ where: { bookingId } });
  return itemToClient(updated, photos);
};

// The customer's answer. Approving records what was actually bought; declining
// marks the line unavailable so the runner knows to leave it.
export const decideSubstitute = async (user, bookingId, itemId, approved) => {
  const { isCustomer } = await loadBooking(user, bookingId);
  if (!isCustomer && user.role !== 'ADMIN') throw new ApiError(403, 'Only the customer can answer this');

  const item = await prisma.bookingItem.findUnique({ where: { id: itemId } });
  if (!item || item.bookingId !== bookingId) throw new ApiError(404, 'Item not found on this booking');
  if (item.status !== 'AWAITING_APPROVAL') throw new ApiError(409, 'There is nothing waiting for an answer on this item');

  const updated = await prisma.bookingItem.update({
    where: { id: itemId },
    data: approved
      ? { status: 'SUBSTITUTED', substitutedWith: item.proposedSubstitute, proposedSubstitute: null, proposedAt: null }
      : { status: 'UNAVAILABLE', substitutedWith: null, proposedSubstitute: null, proposedAt: null }
  });

  const full = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { runner: { include: { user: true } } }
  });
  notifySubstituteDecided(full, { itemName: item.name, proposed: item.proposedSubstitute, approved });

  const photos = await prisma.bookingPhoto.findMany({ where: { bookingId } });
  return itemToClient(updated, photos);
};

export const addPhoto = async (user, bookingId, { kind, dataUrl, caption }) => {
  const { booking, isCustomer, isRunner } = await loadBooking(user, bookingId);

  // A REQUEST photo is the customer showing what they want; a RECEIPT is the
  // runner proving what was spent. Neither side should be posting the other's.
  if (kind === 'REQUEST' && !isCustomer && user.role !== 'ADMIN') {
    throw new ApiError(403, 'Only the customer can add photos of what they need');
  }
  if (kind === 'RECEIPT' && !isRunner && user.role !== 'ADMIN') {
    throw new ApiError(403, 'Only the assigned runner can add a receipt');
  }
  if (kind === 'REQUEST' && ['COMPLETED', 'CANCELLED'].includes(booking.status)) {
    throw new ApiError(409, 'This errand is finished — photos can no longer be added.');
  }

  const url = String(dataUrl || '');
  if (!ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    throw new ApiError(400, 'Photo must be a JPEG, PNG or WebP image');
  }
  if (url.length > MAX_DATA_URL_CHARS) {
    throw new ApiError(400, 'That image is too large — please try a smaller photo');
  }

  const existing = await prisma.bookingPhoto.count({ where: { bookingId, kind } });
  if (existing >= MAX_PHOTOS_PER_KIND) {
    throw new ApiError(400, `You can add up to ${MAX_PHOTOS_PER_KIND} photos`);
  }

  const photo = await prisma.bookingPhoto.create({
    data: {
      bookingId,
      kind,
      dataUrl: url,
      caption: String(caption || '').trim().slice(0, 200) || null,
      uploadedById: user.id
    }
  });

  return photoToClient(photo);
};

export const deletePhoto = async (user, bookingId, photoId) => {
  const { isCustomer, isRunner } = await loadBooking(user, bookingId);
  const photo = await prisma.bookingPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.bookingId !== bookingId) throw new ApiError(404, 'Photo not found on this booking');

  // You can remove your own photo; an admin can remove any.
  const ownsIt = (photo.kind === 'REQUEST' && isCustomer) || (photo.kind === 'RECEIPT' && isRunner);
  if (!ownsIt && user.role !== 'ADMIN') throw new ApiError(403, 'You cannot remove this photo');

  await prisma.bookingPhoto.delete({ where: { id: photoId } });
};
