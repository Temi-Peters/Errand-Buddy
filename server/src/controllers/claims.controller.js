import { createClaim, listClaims, resolveClaim ,
  getClaimThread,
  postClaimMessage
} from '../services/claims.service.js';

export const index = async (req, res, next) => {
  try {
    res.json({ claims: await listClaims(req.user) });
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json({ claim: await createClaim(req.user, req.body.bookingId, req.body) });
  } catch (err) { next(err); }
};

export const resolve = async (req, res, next) => {
  try {
    res.json({ claim: await resolveClaim(req.user, req.params.id, req.body) });
  } catch (err) { next(err); }
};

export const thread = async (req, res, next) => {
  try {
    res.json(await getClaimThread(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
};

export const reply = async (req, res, next) => {
  try {
    res.status(201).json({ message: await postClaimMessage(req.user, req.params.id, req.body?.body) });
  } catch (error) {
    next(error);
  }
};
