import { uploadDocument, listOwnDocuments, listRunnerDocuments, getDocumentFile } from '../services/runnerDocs.service.js';

export const upload = async (req, res, next) => {
  try {
    res.status(201).json({ document: await uploadDocument(req.user, req.body) });
  } catch (err) { next(err); }
};

export const mine = async (req, res, next) => {
  try {
    res.json({ documents: await listOwnDocuments(req.user) });
  } catch (err) { next(err); }
};

export const adminList = async (req, res, next) => {
  try {
    res.json({ documents: await listRunnerDocuments(req.user, req.params.id) });
  } catch (err) { next(err); }
};

export const adminFile = async (req, res, next) => {
  try {
    const { mimeType, fileName, data } = await getDocumentFile(req.user, req.params.docId);
    res.set('Content-Type', mimeType);
    res.set('Content-Disposition', `inline; filename="${fileName}"`);
    res.set('Cache-Control', 'no-store');
    res.send(data);
  } catch (err) { next(err); }
};
