import { prisma } from '../config/prisma.js';

export const createResponse = async (data) => {
  return prisma.surveyResponse.create({
    data: {
      wouldUse: data.wouldUse,
      valueRating: Number(data.valueRating),
      pricePreference: data.pricePreference,
      standoutFeature: data.standoutFeature,
      comment: data.comment ? String(data.comment).trim() || null : null,
      email: data.email ? String(data.email).trim().toLowerCase() || null : null
    }
  });
};

const tally = (rows, key) => rows.reduce((acc, r) => {
  const k = r[key];
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

// Aggregated results for the admin survey view.
export const getResults = async () => {
  const responses = await prisma.surveyResponse.findMany({ orderBy: { createdAt: 'desc' } });
  const total = responses.length;

  const avgRating = total
    ? Math.round((responses.reduce((s, r) => s + r.valueRating, 0) / total) * 10) / 10
    : 0;

  const ratingDistribution = [1, 2, 3, 4, 5].map((n) => ({
    rating: n,
    count: responses.filter((r) => r.valueRating === n).length
  }));

  const comments = responses
    .filter((r) => r.comment)
    .slice(0, 50)
    .map((r) => ({ comment: r.comment, email: r.email, createdAt: r.createdAt.toISOString() }));

  return {
    total,
    avgRating,
    wouldUse: tally(responses, 'wouldUse'),
    standoutFeature: tally(responses, 'standoutFeature'),
    pricePreference: tally(responses, 'pricePreference'),
    ratingDistribution,
    emailsCaptured: responses.filter((r) => r.email).length,
    comments
  };
};
