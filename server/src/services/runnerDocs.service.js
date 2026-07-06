import { prisma } from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';

const ALLOWED_TYPES = ['ID', 'PROOF_OF_ADDRESS'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024;

const requireRunner = (user) => {
  if (user.role !== 'RUNNER' || !user.runnerProfile) throw new ApiError(403, 'Runners only');
  return user.runnerProfile.id;
};

// Runner uploads a verification document (base64). Held only until an admin decides.
export const uploadDocument = async (user, { type, fileName, mimeType, dataBase64 }) => {
  const runnerId = requireRunner(user);

  const docType = String(type || '').toUpperCase();
  if (!ALLOWED_TYPES.includes(docType)) throw new ApiError(400, 'Document type must be ID or PROOF_OF_ADDRESS');
  if (!ALLOWED_MIME.includes(mimeType)) throw new ApiError(400, 'File must be a JPG, PNG, WebP or PDF');

  const base64 = String(dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new ApiError(400, 'The uploaded file is empty');
  if (buffer.length > MAX_BYTES) throw new ApiError(400, 'File must be 8MB or smaller');

  // One document per type — replace any previous upload of the same type
  await prisma.runnerDocument.deleteMany({ where: { runnerId, type: docType } });

  const doc = await prisma.runnerDocument.create({
    data: { runnerId, type: docType, fileName: String(fileName || 'document').slice(0, 200), mimeType, data: buffer }
  });

  return { id: doc.id, type: doc.type, fileName: doc.fileName, mimeType: doc.mimeType };
};

// A runner sees which of their documents are on file (metadata only).
export const listOwnDocuments = async (user) => {
  const runnerId = requireRunner(user);
  const docs = await prisma.runnerDocument.findMany({ where: { runnerId }, select: { id: true, type: true, fileName: true, mimeType: true, createdAt: true } });
  return docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }));
};

// Admin lists a specific runner's submitted documents (metadata only).
export const listRunnerDocuments = async (user, runnerId) => {
  if (user.role !== 'ADMIN') throw new ApiError(403, 'Admins only');
  const docs = await prisma.runnerDocument.findMany({ where: { runnerId }, select: { id: true, type: true, fileName: true, mimeType: true, createdAt: true } });
  return docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }));
};

// Admin streams a single document for review.
export const getDocumentFile = async (user, docId) => {
  if (user.role !== 'ADMIN') throw new ApiError(403, 'Admins only');
  const doc = await prisma.runnerDocument.findUnique({ where: { id: docId } });
  if (!doc) throw new ApiError(404, 'Document not found');
  return { mimeType: doc.mimeType, fileName: doc.fileName, data: doc.data };
};
