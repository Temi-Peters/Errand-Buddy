import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { carerLinkToClient } from '../utils/serializers.js';
import { notifyCarerInvited, notifyCarerInviteAccepted } from './notification.service.js';

const linkInclude = {
  carer: { include: { user: true } },
  client: { include: { user: true } }
};

// Returns the links relevant to a customer, split by the role they play in each.
// - clients: ACTIVE links where this customer is the carer (people they can book for)
// - pendingInvites: PENDING links where this customer is the carer (invites to accept)
// - carers: links where this customer is the client (carers they've invited / who help them)
export const listLinks = async (customerId) => {
  const links = await prisma.carerLink.findMany({
    where: {
      OR: [{ carerId: customerId }, { clientId: customerId }]
    },
    include: linkInclude,
    orderBy: { createdAt: 'desc' }
  });

  const clients = [];
  const pendingInvites = [];
  const carers = [];

  for (const link of links) {
    const dto = carerLinkToClient(link, customerId);
    if (link.carerId === customerId) {
      (link.status === 'ACTIVE' ? clients : pendingInvites).push(dto);
    } else {
      carers.push(dto);
    }
  }

  return { clients, pendingInvites, carers };
};

// A client invites a carer by email. The invited account becomes the carer.
export const inviteCarer = async (clientCustomerId, email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new ApiError(400, 'Carer email is required');

  const carerUser = await prisma.user.findUnique({
    where: { email: normalized },
    include: { customerProfile: true }
  });

  if (!carerUser || !carerUser.customerProfile) {
    throw new ApiError(404, 'No ErrandBuddy customer account found with that email. Ask them to sign up first.');
  }

  const carerId = carerUser.customerProfile.id;
  if (carerId === clientCustomerId) {
    throw new ApiError(400, 'You cannot invite yourself as a carer');
  }

  const existing = await prisma.carerLink.findUnique({
    where: { carerId_clientId: { carerId, clientId: clientCustomerId } }
  });
  if (existing) {
    throw new ApiError(409, existing.status === 'ACTIVE'
      ? 'This person is already your carer'
      : 'You already have a pending invite for this person');
  }

  const link = await prisma.carerLink.create({
    data: { carerId, clientId: clientCustomerId, status: 'PENDING' },
    include: linkInclude
  });

  notifyCarerInvited(link);

  return carerLinkToClient(link, clientCustomerId);
};

// The invited carer accepts a pending invite.
export const acceptInvite = async (carerCustomerId, linkId) => {
  const link = await prisma.carerLink.findUnique({ where: { id: linkId }, include: linkInclude });
  if (!link) throw new ApiError(404, 'Invite not found');
  if (link.carerId !== carerCustomerId) throw new ApiError(403, 'This invite is not addressed to you');
  if (link.status === 'ACTIVE') return carerLinkToClient(link, carerCustomerId);

  const updated = await prisma.carerLink.update({
    where: { id: linkId },
    data: { status: 'ACTIVE' },
    include: linkInclude
  });

  notifyCarerInviteAccepted(updated);

  return carerLinkToClient(updated, carerCustomerId);
};

// Either party (carer or client) can remove the link. Also used by the carer to decline a pending invite.
export const removeLink = async (customerId, linkId) => {
  const link = await prisma.carerLink.findUnique({ where: { id: linkId } });
  if (!link) throw new ApiError(404, 'Link not found');
  if (link.carerId !== customerId && link.clientId !== customerId) {
    throw new ApiError(403, 'This link does not belong to you');
  }
  await prisma.carerLink.delete({ where: { id: linkId } });
};

// Guard used by the booking flow: confirms `carerId` may book on behalf of `clientId`.
export const assertActiveCarerLink = async (carerId, clientId) => {
  const link = await prisma.carerLink.findUnique({
    where: { carerId_clientId: { carerId, clientId } }
  });
  if (!link || link.status !== 'ACTIVE') {
    throw new ApiError(403, 'You are not an active carer for this client');
  }
};
