import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { bookingTypeFromClient, serviceTypeFromClient, serviceTypeToClient, bookingTypeToClient } from '../utils/serializers.js';

const MAX_TEMPLATES = 20;

export const listTemplates = async (customerId) => {
  const templates = await prisma.bookingTemplate.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' }
  });
  return templates.map(templateToClient);
};

export const getTemplate = async (customerId, id) => {
  const template = await prisma.bookingTemplate.findUnique({ where: { id } });
  if (!template) throw new ApiError(404, 'Template not found');
  if (template.customerId !== customerId) throw new ApiError(403, 'Not your template');
  return templateToClient(template);
};

export const createTemplate = async (customerId, data) => {
  const count = await prisma.bookingTemplate.count({ where: { customerId } });
  if (count >= MAX_TEMPLATES) {
    throw new ApiError(400, `You can save up to ${MAX_TEMPLATES} templates`);
  }

  const serviceType = serviceTypeFromClient(data.serviceType);
  if (!serviceType) throw new ApiError(400, 'Valid service type is required');

  const template = await prisma.bookingTemplate.create({
    data: {
      customerId,
      name: String(data.name || '').trim() || `${serviceTypeToClient(serviceType)} template`,
      serviceType,
      bookingType: bookingTypeFromClient(data.bookingType),
      subscription: data.subscription || null,
      time: data.time,
      instructions: data.instructions,
      address: data.address,
      contactPhone: data.contactPhone,
      postcodeArea: data.postcodeArea,
      price: Number(data.price)
    }
  });

  return templateToClient(template);
};

export const deleteTemplate = async (customerId, id) => {
  const template = await prisma.bookingTemplate.findUnique({ where: { id } });
  if (!template) throw new ApiError(404, 'Template not found');
  if (template.customerId !== customerId) throw new ApiError(403, 'Not your template');
  await prisma.bookingTemplate.delete({ where: { id } });
};

export const templateToClient = (t) => ({
  id: t.id,
  name: t.name,
  serviceType: serviceTypeToClient(t.serviceType),
  bookingType: t.bookingType === 'WEEKLY_SUBSCRIPTION'
    ? `Weekly subscription - ${t.subscription || '1 task/week'}`
    : 'One-off task',
  subscription: t.subscription,
  time: t.time,
  instructions: t.instructions,
  address: t.address,
  contactPhone: t.contactPhone,
  postcodeArea: t.postcodeArea,
  price: Number(t.price),
  createdAt: t.createdAt.toISOString()
});
